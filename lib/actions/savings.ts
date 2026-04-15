"use server"

import { revalidatePath } from "next/cache"
import {
  savingsAccountCreateSchema,
  savingsMovementSchema,
  savingsTransactionUpdateSchema,
} from "@/lib/validations/finance"
import { requireSupabaseUser, type ActionResult } from "@/lib/actions/auth-context"
import { zodFirstMessage } from "@/lib/validations/zod-message"
import {
  getPoolBalance,
  getSavingsAccountBalance,
} from "@/lib/actions/balances"
import { APP_CURRENCY_CODE } from "@/lib/constants/currency"
import { round2 } from "@/lib/loan-balance"
import { parseMoneyInput } from "@/lib/format/money"

export async function createSavingsAccount(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const parsed = savingsAccountCreateSchema.safeParse({
    person_id: String(formData.get("person_id") ?? ""),
    liquidity_pool_id: String(formData.get("liquidity_pool_id") ?? ""),
  })

  if (!parsed.success) {
    return { ok: false, message: zodFirstMessage(parsed.error) }
  }

  const { supabase } = auth.data
  const v = parsed.data

  const { data: personRow, error: personErr } = await supabase
    .from("persons")
    .select("id, status, is_member")
    .eq("id", v.person_id)
    .maybeSingle()

  if (personErr) {
    return { ok: false, message: personErr.message }
  }
  if (!personRow || personRow.status !== "active" || !personRow.is_member) {
    return {
      ok: false,
      message:
        "Solo las personas miembros pueden tener cuenta de ahorro. Los no miembros solo pueden solicitar préstamos.",
    }
  }

  const { data, error } = await supabase
    .from("savings_accounts")
    .insert({
      person_id: v.person_id,
      liquidity_pool_id: v.liquidity_pool_id,
      currency: APP_CURRENCY_CODE,
      status: "active",
    })
    .select("id")
    .single()

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin/cuentas-ahorro")
  revalidatePath("/admin")
  return { ok: true, data: { id: data.id } }
}

export async function closeSavingsAccount(
  accountId: string
): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const { supabase } = auth.data
  const balance = await getSavingsAccountBalance(supabase, accountId)
  if (balance !== 0) {
    return {
      ok: false,
      message: "No puedes cerrar la cuenta con saldo distinto de cero",
    }
  }

  const { error } = await supabase
    .from("savings_accounts")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", accountId)
    .eq("status", "active")

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin/cuentas-ahorro")
  revalidatePath(`/admin/cuentas-ahorro/${accountId}`)
  return { ok: true, data: undefined }
}

export async function registerSavingsDeposit(
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const amountRaw = Number(String(formData.get("amount") ?? "").replace(",", "."))
  const parsed = savingsMovementSchema.safeParse({
    account_id: String(formData.get("account_id") ?? ""),
    amount: amountRaw,
    description: String(formData.get("description") ?? ""),
  })

  if (!parsed.success) {
    return { ok: false, message: zodFirstMessage(parsed.error) }
  }

  const { supabase } = auth.data
  const v = parsed.data

  const { data: acc, error: accErr } = await supabase
    .from("savings_accounts")
    .select("id, liquidity_pool_id, status")
    .eq("id", v.account_id)
    .single()

  if (accErr || !acc || acc.status !== "active") {
    return { ok: false, message: "Cuenta no disponible" }
  }

  const { data: tx, error: txErr } = await supabase
    .from("savings_transactions")
    .insert({
      account_id: v.account_id,
      type: "deposit",
      amount: v.amount,
      description: v.description?.trim() || null,
    })
    .select("id")
    .single()

  if (txErr || !tx) {
    return { ok: false, message: txErr?.message ?? "Error al registrar depósito" }
  }

  const { error: poolErr } = await supabase.from("pool_movements").insert({
    pool_id: acc.liquidity_pool_id,
    type: "contribution_from_savings",
    amount: v.amount,
    reference_savings_transaction_id: tx.id,
    description: v.description?.trim() || "Depósito de ahorro",
  })

  if (poolErr) {
    return { ok: false, message: poolErr.message }
  }

  revalidatePath("/admin/cuentas-ahorro")
  revalidatePath(`/admin/cuentas-ahorro/${v.account_id}`)
  revalidatePath("/admin/movimientos-fondo")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}

export async function registerSavingsWithdrawal(
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const amountRaw = Number(String(formData.get("amount") ?? "").replace(",", "."))
  const parsed = savingsMovementSchema.safeParse({
    account_id: String(formData.get("account_id") ?? ""),
    amount: amountRaw,
    description: String(formData.get("description") ?? ""),
  })

  if (!parsed.success) {
    return { ok: false, message: zodFirstMessage(parsed.error) }
  }

  const { supabase } = auth.data
  const v = parsed.data

  const balance = await getSavingsAccountBalance(supabase, v.account_id)
  if (balance < v.amount) {
    return { ok: false, message: "Saldo insuficiente en la cuenta de ahorro" }
  }

  const { data: acc, error: accErr } = await supabase
    .from("savings_accounts")
    .select("id, liquidity_pool_id, status")
    .eq("id", v.account_id)
    .single()

  if (accErr || !acc || acc.status !== "active") {
    return { ok: false, message: "Cuenta no disponible" }
  }

  const poolBalance = await getPoolBalance(supabase, acc.liquidity_pool_id)
  if (poolBalance < v.amount) {
    return {
      ok: false,
      message: "El fondo no tiene liquidez suficiente para este retiro",
    }
  }

  const neg = -v.amount

  const { data: tx, error: txErr } = await supabase
    .from("savings_transactions")
    .insert({
      account_id: v.account_id,
      type: "withdrawal",
      amount: neg,
      description: v.description?.trim() || null,
    })
    .select("id")
    .single()

  if (txErr || !tx) {
    return { ok: false, message: txErr?.message ?? "Error al registrar retiro" }
  }

  const { error: poolErr } = await supabase.from("pool_movements").insert({
    pool_id: acc.liquidity_pool_id,
    type: "withdrawal_to_savings",
    amount: neg,
    reference_savings_transaction_id: tx.id,
    description: v.description?.trim() || "Retiro de ahorro",
  })

  if (poolErr) {
    return { ok: false, message: poolErr.message }
  }

  revalidatePath("/admin/cuentas-ahorro")
  revalidatePath(`/admin/cuentas-ahorro/${v.account_id}`)
  revalidatePath("/admin/movimientos-fondo")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}

export async function deleteSavingsTransaction(
  transactionId: string
): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const { supabase } = auth.data

  const { data: tx, error: txErr } = await supabase
    .from("savings_transactions")
    .select("id, account_id, type, amount")
    .eq("id", transactionId)
    .single()

  if (txErr || !tx) {
    return { ok: false, message: "Movimiento no encontrado" }
  }

  const { data: acc, error: accErr } = await supabase
    .from("savings_accounts")
    .select("id, liquidity_pool_id, status")
    .eq("id", tx.account_id)
    .single()

  if (accErr || !acc) {
    return { ok: false, message: "Cuenta no encontrada" }
  }

  const balance = await getSavingsAccountBalance(supabase, tx.account_id)
  const amt = round2(Number(tx.amount))

  if (tx.type !== "deposit" && tx.type !== "withdrawal") {
    const after = round2(balance - amt)
    if (after < -0.01) {
      return {
        ok: false,
        message: "No se puede eliminar: el saldo de la cuenta quedaría negativo",
      }
    }
  }

  if (tx.type === "deposit") {
    const after = round2(balance - amt)
    if (after < -0.01) {
      return {
        ok: false,
        message: "No se puede eliminar: el saldo de la cuenta quedaría negativo",
      }
    }
    const poolBalance = await getPoolBalance(supabase, acc.liquidity_pool_id)
    if (round2(poolBalance - amt) < -0.01) {
      return {
        ok: false,
        message:
          "No se puede eliminar: el fondo no tiene liquidez suficiente para revertir este depósito",
      }
    }
  }

  if (tx.type === "withdrawal") {
    const w = Math.abs(amt)
    const poolBalance = await getPoolBalance(supabase, acc.liquidity_pool_id)
    if (round2(poolBalance + w) < -0.01) {
      return {
        ok: false,
        message: "No se puede eliminar: inconsistencia de liquidez en el fondo",
      }
    }
  }

  const { error: pmErr } = await supabase
    .from("pool_movements")
    .delete()
    .eq("reference_savings_transaction_id", transactionId)

  if (pmErr) {
    return { ok: false, message: pmErr.message }
  }

  const { error: delErr } = await supabase
    .from("savings_transactions")
    .delete()
    .eq("id", transactionId)

  if (delErr) {
    return { ok: false, message: delErr.message }
  }

  revalidatePath("/admin/cuentas-ahorro")
  revalidatePath(`/admin/cuentas-ahorro/${tx.account_id}`)
  revalidatePath("/admin/movimientos-fondo")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}

export async function updateSavingsTransaction(
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const amountRaw = parseMoneyInput(String(formData.get("amount") ?? ""))
  const parsed = savingsTransactionUpdateSchema.safeParse({
    transaction_id: String(formData.get("transaction_id") ?? ""),
    amount: amountRaw ?? Number.NaN,
    description: String(formData.get("description") ?? ""),
    occurred_at: String(formData.get("occurred_at") ?? ""),
  })

  if (!parsed.success) {
    return { ok: false, message: zodFirstMessage(parsed.error) }
  }

  if (amountRaw === null || Number.isNaN(amountRaw) || amountRaw <= 0) {
    return { ok: false, message: "Monto inválido" }
  }

  const { supabase } = auth.data
  const v = parsed.data

  const { data: tx, error: txErr } = await supabase
    .from("savings_transactions")
    .select("id, account_id, type, amount")
    .eq("id", v.transaction_id)
    .single()

  if (txErr || !tx) {
    return { ok: false, message: "Movimiento no encontrado" }
  }

  if (tx.type !== "deposit" && tx.type !== "withdrawal") {
    return { ok: false, message: "Solo se editan depósitos y retiros desde aquí" }
  }

  const { data: acc, error: accErr } = await supabase
    .from("savings_accounts")
    .select("id, liquidity_pool_id, status")
    .eq("id", tx.account_id)
    .single()

  if (accErr || !acc || acc.status !== "active") {
    return { ok: false, message: "Cuenta no disponible" }
  }

  const oldAmt = round2(Number(tx.amount))
  const absNew = round2(v.amount)
  const newSigned =
    tx.type === "deposit" ? absNew : round2(-absNew)

  const balance = await getSavingsAccountBalance(supabase, tx.account_id)
  const balanceAfter = round2(balance - oldAmt + newSigned)
  if (balanceAfter < -0.01) {
    return { ok: false, message: "El nuevo monto dejaría la cuenta con saldo negativo" }
  }

  const poolBalance = await getPoolBalance(supabase, acc.liquidity_pool_id)
  const oldPoolAmt = oldAmt
  const newPoolAmt = newSigned
  const poolAfter = round2(poolBalance - oldPoolAmt + newPoolAmt)
  if (poolAfter < -0.01) {
    return {
      ok: false,
      message: "El fondo no tiene liquidez suficiente para este movimiento",
    }
  }

  const paidAt = new Date(v.occurred_at)
  if (Number.isNaN(paidAt.getTime())) {
    return { ok: false, message: "Fecha u hora inválida" }
  }
  const occurredIso = paidAt.toISOString()
  const descTrim = v.description?.trim() || null

  const { error: upTx } = await supabase
    .from("savings_transactions")
    .update({
      amount: newSigned,
      description: descTrim,
      occurred_at: occurredIso,
    })
    .eq("id", v.transaction_id)

  if (upTx) {
    return { ok: false, message: upTx.message }
  }

  const poolDesc =
    descTrim ??
    (tx.type === "deposit" ? "Depósito de ahorro" : "Retiro de ahorro")

  const { error: upPm } = await supabase
    .from("pool_movements")
    .update({
      amount: newPoolAmt,
      description: poolDesc,
      occurred_at: occurredIso,
    })
    .eq("reference_savings_transaction_id", v.transaction_id)

  if (upPm) {
    return { ok: false, message: upPm.message }
  }

  revalidatePath("/admin/cuentas-ahorro")
  revalidatePath(`/admin/cuentas-ahorro/${tx.account_id}`)
  revalidatePath("/admin/movimientos-fondo")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}
