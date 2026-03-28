import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import { getPoolBalance } from "@/lib/actions/balances"
import type { LiquidityPoolRow } from "@/lib/database.types"
import {
  FondosPanel,
  type FondoListRow,
} from "@/components/admin/fondos/fondos-panel"

interface PageProps {
  searchParams: Promise<{ nueva?: string; editar?: string }>
}

export default async function FondosPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const { supabase } = await getAdminSupabaseOrRedirect()

  const { data: pools, error } = await supabase
    .from("liquidity_pools")
    .select("*")
    .order("name")

  const base = (pools ?? []) as LiquidityPoolRow[]
  const list: FondoListRow[] = []
  for (const p of base) {
    list.push({ ...p, balance: await getPoolBalance(supabase, p.id) })
  }

  return (
    <FondosPanel
      pools={list}
      errorMessage={error?.message ?? null}
      initialOpenCreate={sp.nueva === "1"}
      initialEditId={
        typeof sp.editar === "string"
          ? sp.editar
          : Array.isArray(sp.editar)
            ? sp.editar[0]
            : null
      }
    />
  )
}
