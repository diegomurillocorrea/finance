"use server"

import { revalidatePath } from "next/cache"
import { toNumber } from "@/lib/format/money"
import {
  outstandingPrincipal,
  round2,
  totalPrincipalRepaidFromRows,
} from "@/lib/loan-balance"
import { getPoolBalance } from "@/lib/actions/balances"
import { requireSupabaseUser, type ActionResult } from "@/lib/actions/auth-context"
import {
  loanAbonoInterestSchema,
  loanAbonoPrincipalSchema,
  loanCreateSchema,
  loanPaymentUpdateSchema,
  loanUpdateDraftSchema,
} from "@/lib/validations/finance"
import { zodFirstMessage } from "@/lib/validations/zod-message"
import type { SupabaseClient } from "@supabase/supabase-js"

async function fetchPrincipalRepaidSum(
  supabase: SupabaseClient,
  loanId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("loan_payments")
    .select("principal_portion")
    .eq("loan_id", loanId)

  if (error || !data) return 0
  return totalPrincipalRepaidFromRows(data)
}

async function maybeMarkLoanPaid(
  supabase: SupabaseClient,
  loanId: string,
  originalPrincipal: number
) {
  const repaid = await fetchPrincipalRepaidSum(supabase, loanId)
  const remaining = outstandingPrincipal(originalPrincipal, repaid)
  if (remaining <= 0.01) {
    await supabase.from("loans").update({ status: "paid" }).eq("id", loanId)
  }
}

async function syncLoanStatusFromRepayments(
  supabase: SupabaseClient,
  loanId: string,
  originalPrincipal: number
) {
  const repaid = await fetchPrincipalRepaidSum(supabase, loanId)
  const remaining = outstandingPrincipal(originalPrincipal, repaid)
  if (remaining <= 0.01) {
    await supabase.from("loans").update({ status: "paid" }).eq("id", loanId)
    return
  }
  const { data: loan } = await supabase
    .from("loans")
    .select("status")
    .eq("id", loanId)
    .maybeSingle()
  if (loan?.status === "paid") {
    await supabase.from("loans").update({ status: "active" }).eq("id", loanId)
  }
}

async function deletePoolMovementsForLoanPayment(
  supabase: SupabaseClient,
  loanId: string,
  paymentId: string,
  principalPortion: number,
  interestPortion: number
): Promise<string | null> {
  const { data: byRef, error: qErr } = await supabase
    .from("pool_movements")
    .select("id")
    .eq("reference_loan_payment_id", paymentId)

  if (qErr) {
    return qErr.message
  }

  if (byRef && byRef.length > 0) {
    const { error } = await supabase
      .from("pool_movements")
      .delete()
      .eq("reference_loan_payment_id", paymentId)
    return error?.message ?? null
  }

  const tryDeleteOne = async (
    type: "loan_repayment_principal" | "loan_repayment_interest",
    amt: number
  ): Promise<string | null> => {
    if (amt <= 0.01) return null
    const { data: row } = await supabase
      .from("pool_movements")
      .select("id")
      .eq("reference_loan_id", loanId)
      .is("reference_loan_payment_id", null)
      .eq("type", type)
      .eq("amount", String(round2(amt)))
      .limit(1)
      .maybeSingle()
    if (!row?.id) return null
    const { error } = await supabase.from("pool_movements").delete().eq("id", row.id)
    if (error) return error.message
    return null
  }

  const e1 = await tryDeleteOne("loan_repayment_principal", principalPortion)
  if (e1) return e1
  const e2 = await tryDeleteOne("loan_repayment_interest", interestPortion)
  return e2
}

export async function createLoan(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const principal = Number(String(formData.get("principal") ?? "").replace(",", "."))
  const monthlyRate = Number(String(formData.get("monthly_interest_rate") ?? "").replace(",", "."))
  const term = Number(String(formData.get("term_months") ?? ""))

  const parsed = loanCreateSchema.safeParse({
    borrower_id: String(formData.get("borrower_id") ?? ""),
    liquidity_pool_id: String(formData.get("liquidity_pool_id") ?? ""),
    principal,
    monthly_interest_rate: monthlyRate,
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
      monthly_interest_rate: v.monthly_interest_rate,
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
  const monthlyRate = Number(String(formData.get("monthly_interest_rate") ?? "").replace(",", "."))
  const term = Number(String(formData.get("term_months") ?? ""))

  const parsed = loanUpdateDraftSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    principal,
    monthly_interest_rate: monthlyRate,
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
      monthly_interest_rate: v.monthly_interest_rate,
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

  const { error: delErr } = await supabase
    .from("loan_installments")
    .delete()
    .eq("loan_id", loanId)

  if (delErr) {
    return { ok: false, message: delErr.message }
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
      maturity_date: null,
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

function parseAmountField(formData: FormData, key: string, emptyAsZero: boolean): number {
  const raw = String(formData.get(key) ?? "")
    .trim()
    .replace(",", ".")
  if (raw === "" && emptyAsZero) return 0
  const n = Number(raw)
  if (Number.isNaN(n)) return Number.NaN
  return round2(n)
}

/**
 * `interest`: solo interés. `principal`: capital e interés en un mismo registro (cualquiera puede ser 0 si el otro no).
 */
export async function registerLoanAbono(formData: FormData): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const loanId = String(formData.get("loan_id") ?? "")
  const abonoKind = String(formData.get("abono_kind") ?? "")
  const notes = String(formData.get("notes") ?? "")

  const { supabase } = auth.data

  const { data: loan, error: lErr } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .single()

  if (lErr || !loan || loan.status !== "active") {
    return { ok: false, message: "Préstamo no activo" }
  }

  const originalPrincipal = toNumber(loan.principal)
  const repaidBefore = await fetchPrincipalRepaidSum(supabase, loanId)
  const outstandingBefore = outstandingPrincipal(originalPrincipal, repaidBefore)

  if (outstandingBefore <= 0.01) {
    return { ok: false, message: "No hay capital pendiente en este préstamo" }
  }

  let principalPortion = 0
  let interestPortion = 0
  let totalAmount = 0
  let defaultNote = "Abono"

  if (abonoKind === "interest") {
    const interest_amount = parseAmountField(formData, "interest_amount", false)
    const parsed = loanAbonoInterestSchema.safeParse({
      loan_id: loanId,
      abono_kind: "interest",
      interest_amount,
      notes,
    })
    if (!parsed.success) {
      return { ok: false, message: zodFirstMessage(parsed.error) }
    }
    interestPortion = parsed.data.interest_amount
    totalAmount = interestPortion
    defaultNote = "Pago de intereses"
  } else if (abonoKind === "principal") {
    const principal_amount = parseAmountField(formData, "principal_amount", true)
    const interest_amount = parseAmountField(formData, "interest_amount", true)
    if (Number.isNaN(principal_amount) || Number.isNaN(interest_amount)) {
      return { ok: false, message: "Cantidad inválida" }
    }
    const parsed = loanAbonoPrincipalSchema.safeParse({
      loan_id: loanId,
      abono_kind: "principal",
      principal_amount,
      interest_amount,
      notes,
    })
    if (!parsed.success) {
      return { ok: false, message: zodFirstMessage(parsed.error) }
    }
    principalPortion = parsed.data.principal_amount
    interestPortion = parsed.data.interest_amount
    if (principalPortion > outstandingBefore + 0.01) {
      return {
        ok: false,
        message: `El abono a capital no puede superar el saldo (${outstandingBefore.toFixed(2)})`,
      }
    }
    totalAmount = round2(principalPortion + interestPortion)
    defaultNote =
      principalPortion > 0 && interestPortion > 0
        ? "Abono a capital e interés"
        : principalPortion > 0
          ? "Abono a capital"
          : "Pago de intereses"
  } else {
    return { ok: false, message: "Tipo de abono inválido" }
  }

  const notesTrim = notes.trim() || null

  const { data: paymentRow, error: payErr } = await supabase
    .from("loan_payments")
    .insert({
      loan_id: loanId,
      amount: totalAmount,
      principal_portion: principalPortion,
      interest_portion: interestPortion,
      penalty_portion: 0,
      notes: notesTrim ?? defaultNote,
    })
    .select("id")
    .single()

  if (payErr || !paymentRow) {
    return { ok: false, message: payErr?.message ?? "Error al registrar pago" }
  }

  const paymentId = paymentRow.id

  if (principalPortion > 0) {
    const { error: e1 } = await supabase.from("pool_movements").insert({
      pool_id: loan.liquidity_pool_id,
      type: "loan_repayment_principal",
      amount: principalPortion,
      reference_loan_id: loanId,
      reference_loan_payment_id: paymentId,
      description: notesTrim || "Abono a capital",
    })
    if (e1) return { ok: false, message: e1.message }
  }

  if (interestPortion > 0) {
    const { error: e2 } = await supabase.from("pool_movements").insert({
      pool_id: loan.liquidity_pool_id,
      type: "loan_repayment_interest",
      amount: interestPortion,
      reference_loan_id: loanId,
      reference_loan_payment_id: paymentId,
      description: notesTrim || "Pago de intereses",
    })
    if (e2) return { ok: false, message: e2.message }
  }

  await maybeMarkLoanPaid(supabase, loanId, originalPrincipal)

  revalidatePath("/admin/prestamos")
  revalidatePath(`/admin/prestamos/${loanId}`)
  revalidatePath("/admin/movimientos-fondo")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}

export async function deleteLoanPayment(paymentId: string): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth
  const { supabase } = auth.data

  const { data: pay, error: pErr } = await supabase
    .from("loan_payments")
    .select("*")
    .eq("id", paymentId)
    .single()

  if (pErr || !pay) {
    return { ok: false, message: "Pago no encontrado" }
  }

  const { data: loan, error: lErr } = await supabase
    .from("loans")
    .select("*")
    .eq("id", pay.loan_id)
    .single()

  if (lErr || !loan) {
    return { ok: false, message: "Préstamo no encontrado" }
  }
  if (loan.status !== "active" && loan.status !== "paid") {
    return {
      ok: false,
      message: "No se puede eliminar el pago en el estado actual del préstamo",
    }
  }

  const pp = round2(toNumber(pay.principal_portion))
  const ip = round2(toNumber(pay.interest_portion))

  const delPoolErr = await deletePoolMovementsForLoanPayment(
    supabase,
    pay.loan_id,
    paymentId,
    pp,
    ip
  )
  if (delPoolErr) {
    return { ok: false, message: delPoolErr }
  }

  const { error: delPay } = await supabase.from("loan_payments").delete().eq("id", paymentId)
  if (delPay) {
    return { ok: false, message: delPay.message }
  }

  await syncLoanStatusFromRepayments(supabase, pay.loan_id, toNumber(loan.principal))

  revalidatePath("/admin/prestamos")
  revalidatePath(`/admin/prestamos/${pay.loan_id}`)
  revalidatePath("/admin/movimientos-fondo")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}

export async function updateLoanPayment(formData: FormData): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const principal_amount = parseAmountField(formData, "principal_amount", true)
  const interest_amount = parseAmountField(formData, "interest_amount", true)
  if (Number.isNaN(principal_amount) || Number.isNaN(interest_amount)) {
    return { ok: false, message: "Cantidad inválida" }
  }

  const parsed = loanPaymentUpdateSchema.safeParse({
    payment_id: String(formData.get("payment_id") ?? ""),
    principal_amount,
    interest_amount,
    notes: String(formData.get("notes") ?? ""),
    paid_at: String(formData.get("paid_at") ?? ""),
  })

  if (!parsed.success) {
    return { ok: false, message: zodFirstMessage(parsed.error) }
  }

  const { supabase } = auth.data
  const v = parsed.data

  const { data: pay, error: payErr } = await supabase
    .from("loan_payments")
    .select("*")
    .eq("id", v.payment_id)
    .single()

  if (payErr || !pay) {
    return { ok: false, message: "Pago no encontrado" }
  }

  const { data: loan, error: lErr } = await supabase
    .from("loans")
    .select("*")
    .eq("id", pay.loan_id)
    .single()

  if (lErr || !loan) {
    return { ok: false, message: "Préstamo no encontrado" }
  }
  if (loan.status !== "active" && loan.status !== "paid") {
    return {
      ok: false,
      message: "No se puede editar el pago en el estado actual del préstamo",
    }
  }

  const originalPrincipal = toNumber(loan.principal)
  const totalRepaid = await fetchPrincipalRepaidSum(supabase, pay.loan_id)
  const currentOutstanding = outstandingPrincipal(originalPrincipal, totalRepaid)
  const oldPrincipal = round2(toNumber(pay.principal_portion))
  const maxPrincipal = round2(currentOutstanding + oldPrincipal)

  if (v.principal_amount > maxPrincipal + 0.01) {
    return {
      ok: false,
      message: `El abono a capital no puede superar el saldo (${maxPrincipal.toFixed(2)})`,
    }
  }

  const principalPortion = round2(v.principal_amount)
  const interestPortion = round2(v.interest_amount)
  const totalAmount = round2(principalPortion + interestPortion)
  const notesTrim = (v.notes ?? "").trim() || null
  const defaultNote =
    principalPortion > 0 && interestPortion > 0
      ? "Abono a capital e interés"
      : principalPortion > 0
        ? "Abono a capital"
        : "Pago de intereses"

  const paidAt = new Date(v.paid_at)
  if (Number.isNaN(paidAt.getTime())) {
    return { ok: false, message: "Fecha u hora inválida" }
  }
  const paidAtIso = paidAt.toISOString()

  const oldP = round2(toNumber(pay.principal_portion))
  const oldI = round2(toNumber(pay.interest_portion))
  const delPoolErr = await deletePoolMovementsForLoanPayment(
    supabase,
    pay.loan_id,
    v.payment_id,
    oldP,
    oldI
  )
  if (delPoolErr) {
    return { ok: false, message: delPoolErr }
  }

  const { error: upPay } = await supabase
    .from("loan_payments")
    .update({
      amount: totalAmount,
      principal_portion: principalPortion,
      interest_portion: interestPortion,
      penalty_portion: 0,
      notes: notesTrim ?? defaultNote,
      paid_at: paidAtIso,
    })
    .eq("id", v.payment_id)

  if (upPay) {
    return { ok: false, message: upPay.message }
  }

  if (principalPortion > 0) {
    const { error: e1 } = await supabase.from("pool_movements").insert({
      pool_id: loan.liquidity_pool_id,
      type: "loan_repayment_principal",
      amount: principalPortion,
      reference_loan_id: pay.loan_id,
      reference_loan_payment_id: v.payment_id,
      description: notesTrim || "Abono a capital",
      occurred_at: paidAtIso,
    })
    if (e1) return { ok: false, message: e1.message }
  }

  if (interestPortion > 0) {
    const { error: e2 } = await supabase.from("pool_movements").insert({
      pool_id: loan.liquidity_pool_id,
      type: "loan_repayment_interest",
      amount: interestPortion,
      reference_loan_id: pay.loan_id,
      reference_loan_payment_id: v.payment_id,
      description: notesTrim || "Pago de intereses",
      occurred_at: paidAtIso,
    })
    if (e2) return { ok: false, message: e2.message }
  }

  await syncLoanStatusFromRepayments(supabase, pay.loan_id, originalPrincipal)

  revalidatePath("/admin/prestamos")
  revalidatePath(`/admin/prestamos/${pay.loan_id}`)
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
