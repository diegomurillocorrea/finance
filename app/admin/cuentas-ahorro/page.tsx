import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import {
  CuentasAhorroPanel,
  type CuentaListaRow,
} from "@/components/admin/cuentas-ahorro/cuentas-ahorro-panel"

interface PageProps {
  searchParams: Promise<{ nueva?: string }>
}

export default async function CuentasAhorroPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const { supabase } = await getAdminSupabaseOrRedirect()

  const [{ data: accounts, error }, { data: persons }, { data: pools }] = await Promise.all([
    supabase
      .from("savings_accounts")
      .select(
        `
      id,
      status,
      opened_at,
      persons (full_name),
      liquidity_pools (name)
    `
      )
      .order("opened_at", { ascending: false }),
    supabase
      .from("persons")
      .select("id, full_name, phone")
      .eq("status", "active")
      .eq("is_member", true)
      .order("full_name"),
    supabase.from("liquidity_pools").select("id, name").order("name"),
  ])

  const list: CuentaListaRow[] = (accounts ?? []).map((row) => {
    const r = row as {
      id: string
      status: string
      opened_at: string
      persons: { full_name: string } | { full_name: string }[] | null
      liquidity_pools: { name: string } | { name: string }[] | null
    }
    const p = r.persons
    const pool = r.liquidity_pools
    return {
      id: r.id,
      status: r.status,
      opened_at: r.opened_at,
      persons: Array.isArray(p) ? p[0] ?? null : p ?? null,
      liquidity_pools: Array.isArray(pool) ? pool[0] ?? null : pool ?? null,
    }
  })

  return (
    <CuentasAhorroPanel
      accounts={list}
      persons={persons ?? []}
      pools={pools ?? []}
      errorMessage={error?.message ?? null}
      initialOpenCreate={sp.nueva === "1"}
    />
  )
}
