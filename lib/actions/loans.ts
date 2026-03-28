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

  const { error: payErr } = await supabase.from("loan_payments").insert({
    loan_id: loanId,
    amount: totalAmount,
    principal_portion: principalPortion,
    interest_portion: interestPortion,
    penalty_portion: 0,
    notes: notesTrim ?? defaultNote,
  })

  if (payErr) {
    return { ok: false, message: payErr.message }
  }

  if (principalPortion > 0) {
    const { error: e1 } = await supabase.from("pool_movements").insert({
      pool_id: loan.liquidity_pool_id,
      type: "loan_repayment_principal",
      amount: principalPortion,
      reference_loan_id: loanId,
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
