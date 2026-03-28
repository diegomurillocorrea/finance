"use server"

import type { SupabaseClient } from "@supabase/supabase-js"
import { toNumber } from "@/lib/format/money"

export async function getSavingsAccountBalance(
  supabase: SupabaseClient,
  accountId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("savings_transactions")
    .select("amount")
    .eq("account_id", accountId)

  if (error || !data) return 0
  return data.reduce((sum, row) => sum + toNumber(row.amount), 0)
}

export async function getPoolBalance(
  supabase: SupabaseClient,
  poolId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("pool_movements")
    .select("amount")
    .eq("pool_id", poolId)

  if (error || !data) return 0
  return data.reduce((sum, row) => sum + toNumber(row.amount), 0)
}
