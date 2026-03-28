"use server"

import { revalidatePath } from "next/cache"
import { buildAmortizationSchedule } from "@/lib/loan-schedule"
import { toNumber } from "@/lib/format/money"
import { getPoolBalance } from "@/lib/actions/balances"
import { requireSupabaseUser, type ActionResult } from "@/lib/actions/auth-context"
import {
  customLoanPaymentSchema,
  loanCreateSchema,
  loanUpdateDraftSchema,
} from "@/lib/validations/finance"
import { zodFirstMessage } from "@/lib/validations/zod-message"

export async function createLoan(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const principal = Number(String(formData.get("principal") ?? "").replace(",", "."))
  const annual = Number(String(formData.get("annual_interest_rate") ?? "").replace(",", "."))
  const term = Number(String(formData.get("term_months") ?? ""))

  const parsed = loanCreateSchema.safeParse({
    borrower_id: String(formData.get("borrower_id") ?? ""),
    liquidity_pool_id: String(formData.get("liquidity_pool_id") ?? ""),
    principal,
    annual_interest_rate: annual,
    term_months: term,
    payment_frequency: String(formData.get("payment_frequency") ?? "monthly"),
    purpose: String(formData.get("purpose") ?? ""),
    status:
      String(formData.get("status") ?? "draft") === "pending_approval"
        ? "pending_approval"
        : "draft",
  })

  if (!parsed.success) {
    return { ok: false, message: zodFirstMessage(parsed.error) }
  }

  const { supabase } = auth.data
  const v = parsed.data

  const { data, error } = await supabase
    .from("loans")
    .insert({
      borrower_id: v.borrower_id,
      liquidity_pool_id: v.liquidity_pool_id,
      principal: v.principal,
      annual_interest_rate: v.annual_interest_rate,
      term_months: v.term_months,
      payment_frequency: v.payment_frequency,
      purpose: v.purpose?.trim() || null,
      status: v.status ?? "draft",
    })
    .select("id")
    .single()

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin/prestamos")
  revalidatePath("/admin")
  return { ok: true, data: { id: data.id } }
}

export async function updateLoanDraft(
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const principal = Number(String(formData.get("principal") ?? "").replace(",", "."))
  const annual = Number(String(formData.get("annual_interest_rate") ?? "").replace(",", "."))
  const term = Number(String(formData.get("term_months") ?? ""))

  const parsed = loanUpdateDraftSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    principal,
    annual_interest_rate: annual,
    term_months: term,
    payment_frequency: String(formData.get("payment_frequency") ?? "monthly"),
    purpose: String(formData.get("purpose") ?? ""),
  })

  if (!parsed.success) {
    return { ok: false, message: zodFirstMessage(parsed.error) }
  }

  const { supabase } = auth.data
  const v = parsed.data

  const { data: existing, error: loadErr } = await supabase
    .from("loans")
    .select("status")
    .eq("id", v.id)
    .single()

  if (loadErr || !existing) {
    return { ok: false, message: "Préstamo no encontrado" }
  }
  if (existing.status !== "draft" && existing.status !== "pending_approval") {
    return { ok: false, message: "Solo se puede editar en borrador o pendiente" }
  }

  const { error } = await supabase
    .from("loans")
    .update({
      principal: v.principal,
      annual_interest_rate: v.annual_interest_rate,
      term_months: v.term_months,
      payment_frequency: v.payment_frequency,
      purpose: v.purpose?.trim() || null,
    })
    .eq("id", v.id)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin/prestamos")
  revalidatePath(`/admin/prestamos/${v.id}`)
  return { ok: true, data: undefined }
}

export async function disburseLoan(loanId: string): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth
  const { supabase } = auth.data

  const { data: loan, error: lErr } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .single()

  if (lErr || !loan) {
    return { ok: false, message: "Préstamo no encontrado" }
  }
  if (loan.status !== "draft" && loan.status !== "pending_approval") {
    return { ok: false, message: "Este préstamo ya fue desembolsado o no aplica" }
  }

  const principal = toNumber(loan.principal)
  const poolBalance = await getPoolBalance(supabase, loan.liquidity_pool_id)
  if (poolBalance < principal) {
    return {
      ok: false,
      message: `Liquidez insuficiente en el fondo (disponible ${poolBalance.toFixed(2)})`,
    }
  }

  const disbursedAt = new Date().toISOString()
  const firstDueIso = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  })()

  const schedule = buildAmortizationSchedule(
    principal,
    toNumber(loan.annual_interest_rate),
    loan.term_months,
    firstDueIso
  )

  const maturityDate = schedule.length
    ? schedule[schedule.length - 1].dueDate
    : null

  const { error: delErr } = await supabase
    .from("loan_installments")
    .delete()
    .eq("loan_id", loanId)

  if (delErr) {
    return { ok: false, message: delErr.message }
  }

  if (schedule.length) {
    const rows = schedule.map((r) => ({
      loan_id: loanId,
      installment_number: r.installmentNumber,
      due_date: r.dueDate,
      principal_due: r.principalDue,
      interest_due: r.interestDue,
      total_due: r.totalDue,
      status: "pending" as const,
    }))
    const { error: insErr } = await supabase.from("loan_installments").insert(rows)
    if (insErr) {
      return { ok: false, message: insErr.message }
    }
  }

  const { error: poolErr } = await supabase.from("pool_movements").insert({
    pool_id: loan.liquidity_pool_id,
    type: "loan_disbursement",
    amount: -principal,
    reference_loan_id: loanId,
    description: "Desembolso de préstamo",
  })

  if (poolErr) {
    return { ok: false, message: poolErr.message }
  }

  const { error: upErr } = await supabase
    .from("loans")
    .update({
      status: "active",
      disbursed_at: disbursedAt,
      maturity_date: maturityDate,
    })
    .eq("id", loanId)

  if (upErr) {
    return { ok: false, message: upErr.message }
  }

  revalidatePath("/admin/prestamos")
  revalidatePath(`/admin/prestamos/${loanId}`)
  revalidatePath("/admin/movimientos-fondo")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}

export async function payNextLoanInstallment(
  loanId: string
): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth
  const { supabase } = auth.data

  const { data: loan, error: lErr } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .single()

  if (lErr || !loan || loan.status !== "active") {
    return { ok: false, message: "Préstamo no activo" }
  }

  const { data: nextCuota, error: cErr } = await supabase
    .from("loan_installments")
    .select("*")
    .eq("loan_id", loanId)
    .in("status", ["pending", "partial", "overdue"])
    .order("installment_number", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (cErr || !nextCuota) {
    return { ok: false, message: "No hay cuotas pendientes" }
  }

  const principalPortion = toNumber(nextCuota.principal_due)
  const interestPortion = toNumber(nextCuota.interest_due)
  const amount = toNumber(nextCuota.total_due)

  const { error: payErr } = await supabase.from("loan_payments").insert({
    loan_id: loanId,
    amount,
    principal_portion: principalPortion,
    interest_portion: interestPortion,
    penalty_portion: 0,
    notes: `Cuota ${String(nextCuota.installment_number)}`,
  })

  if (payErr) {
    return { ok: false, message: payErr.message }
  }

  const { error: p1 } = await supabase.from("pool_movements").insert({
    pool_id: loan.liquidity_pool_id,
    type: "loan_repayment_principal",
    amount: principalPortion,
    reference_loan_id: loanId,
    description: `Abono capital cuota ${String(nextCuota.installment_number)}`,
  })
  if (p1) return { ok: false, message: p1.message }

  const { error: p2 } = await supabase.from("pool_movements").insert({
    pool_id: loan.liquidity_pool_id,
    type: "loan_repayment_interest",
    amount: interestPortion,
    reference_loan_id: loanId,
    description: `Interés cuota ${String(nextCuota.installment_number)}`,
  })
  if (p2) return { ok: false, message: p2.message }

  const { error: upCuota } = await supabase
    .from("loan_installments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", nextCuota.id)

  if (upCuota) {
    return { ok: false, message: upCuota.message }
  }

  const { count, error: cntErr } = await supabase
    .from("loan_installments")
    .select("*", { count: "exact", head: true })
    .eq("loan_id", loanId)
    .neq("status", "paid")

  if (!cntErr && (count ?? 0) === 0) {
    await supabase.from("loans").update({ status: "paid" }).eq("id", loanId)
  }

  revalidatePath("/admin/prestamos")
  revalidatePath(`/admin/prestamos/${loanId}`)
  revalidatePath("/admin/movimientos-fondo")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}

export async function recordCustomLoanPayment(
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."))
  const principalPortion = Number(
    String(formData.get("principal_portion") ?? "").replace(",", ".")
  )
  const interestPortion = Number(
    String(formData.get("interest_portion") ?? "").replace(",", ".")
  )
  const penaltyPortion = Number(
    String(formData.get("penalty_portion") ?? "0").replace(",", ".")
  )

  const parsed = customLoanPaymentSchema.safeParse({
    loan_id: String(formData.get("loan_id") ?? ""),
    amount,
    principal_portion: principalPortion,
    interest_portion: interestPortion,
    penalty_portion: penaltyPortion,
    notes: String(formData.get("notes") ?? ""),
  })

  if (!parsed.success) {
    return { ok: false, message: zodFirstMessage(parsed.error) }
  }

  const v = parsed.data
  const sum = v.principal_portion + v.interest_portion + (v.penalty_portion ?? 0)
  if (Math.abs(sum - v.amount) > 0.01) {
    return { ok: false, message: "La suma de capital + interés + mora debe igualar el monto" }
  }

  const { supabase } = auth.data

  const { data: loan, error: lErr } = await supabase
    .from("loans")
    .select("*")
    .eq("id", v.loan_id)
    .single()

  if (lErr || !loan || loan.status !== "active") {
    return { ok: false, message: "Préstamo no activo" }
  }

  const { error: payErr } = await supabase.from("loan_payments").insert({
    loan_id: v.loan_id,
    amount: v.amount,
    principal_portion: v.principal_portion,
    interest_portion: v.interest_portion,
    penalty_portion: v.penalty_portion ?? 0,
    notes: v.notes?.trim() || null,
  })

  if (payErr) {
    return { ok: false, message: payErr.message }
  }

  if (v.principal_portion > 0) {
    const { error: e1 } = await supabase.from("pool_movements").insert({
      pool_id: loan.liquidity_pool_id,
      type: "loan_repayment_principal",
      amount: v.principal_portion,
      reference_loan_id: v.loan_id,
      description: v.notes?.trim() || "Abono a capital",
    })
    if (e1) return { ok: false, message: e1.message }
  }

  if (v.interest_portion > 0) {
    const { error: e2 } = await supabase.from("pool_movements").insert({
      pool_id: loan.liquidity_pool_id,
      type: "loan_repayment_interest",
      amount: v.interest_portion,
      reference_loan_id: v.loan_id,
      description: v.notes?.trim() || "Pago de intereses",
    })
    if (e2) return { ok: false, message: e2.message }
  }

  if ((v.penalty_portion ?? 0) > 0) {
    const { error: e3 } = await supabase.from("pool_movements").insert({
      pool_id: loan.liquidity_pool_id,
      type: "adjustment",
      amount: v.penalty_portion ?? 0,
      reference_loan_id: v.loan_id,
      description: v.notes?.trim() || "Mora u otro concepto",
    })
    if (e3) return { ok: false, message: e3.message }
  }

  revalidatePath("/admin/prestamos")
  revalidatePath(`/admin/prestamos/${v.loan_id}`)
  revalidatePath("/admin/movimientos-fondo")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}

export async function cancelLoanDraft(loanId: string): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth
  const { supabase } = auth.data

  const { data: loan, error: lErr } = await supabase
    .from("loans")
    .select("status")
    .eq("id", loanId)
    .single()

  if (lErr || !loan) {
    return { ok: false, message: "Préstamo no encontrado" }
  }
  if (loan.status !== "draft" && loan.status !== "pending_approval") {
    return { ok: false, message: "Solo se pueden cancelar borradores" }
  }

  const { error } = await supabase
    .from("loans")
    .update({ status: "cancelled" })
    .eq("id", loanId)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin/prestamos")
  revalidatePath(`/admin/prestamos/${loanId}`)
  return { ok: true, data: undefined }
}
