"use server"

import { revalidatePath } from "next/cache"
import {
  savingsAccountCreateSchema,
  savingsMovementSchema,
} from "@/lib/validations/finance"
import { requireSupabaseUser, type ActionResult } from "@/lib/actions/auth-context"
import { zodFirstMessage } from "@/lib/validations/zod-message"
import {
  getPoolBalance,
  getSavingsAccountBalance,
} from "@/lib/actions/balances"
import { APP_CURRENCY_CODE } from "@/lib/constants/currency"

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
