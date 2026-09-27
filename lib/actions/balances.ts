"use server"

import type { SupabaseClient } from "@supabase/supabase-js"
import { toNumber } from "@/lib/format/money"

const TRANSACTION_PAGE_SIZE = 1000

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

export async function getSavingsBalancesByAccount(
  supabase: SupabaseClient
): Promise<{ balances: Map<string, number>; errorMessage: string | null }> {
  const balances = new Map<string, number>()
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from("savings_transactions")
      .select("account_id, amount")
      .range(from, from + TRANSACTION_PAGE_SIZE - 1)

    if (error) {
      return { balances, errorMessage: error.message }
    }
    if (!data?.length) break

    for (const row of data) {
      const accountId = String(row.account_id)
      balances.set(accountId, (balances.get(accountId) ?? 0) + toNumber(row.amount))
    }

    if (data.length < TRANSACTION_PAGE_SIZE) break
    from += TRANSACTION_PAGE_SIZE
  }

  return { balances, errorMessage: null }
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
