import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import {
  PrestamosPanel,
  type PrestamoListaRow,
} from "@/components/admin/prestamos/prestamos-panel"

interface PageProps {
  searchParams: Promise<{ nueva?: string }>
}

export default async function PrestamosPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const { supabase } = await getAdminSupabaseOrRedirect()

  const [{ data: loans, error }, { data: persons }, { data: pools }] = await Promise.all([
    supabase
      .from("loans")
      .select(
        `
      id,
      principal,
      monthly_interest_rate,
      term_months,
      status,
      disbursed_at,
      persons!borrower_id (full_name),
      liquidity_pools (name, currency)
    `
      )
      .order("created_at", { ascending: false }),
    supabase.from("persons").select("id, full_name").eq("status", "active").order("full_name"),
    supabase.from("liquidity_pools").select("id, name").order("name"),
  ])

  const list: PrestamoListaRow[] = (loans ?? []).map((row) => {
    const r = row as {
      id: string
      principal: string
      monthly_interest_rate: string
      term_months: number
      status: string
      disbursed_at: string | null
      persons: { full_name: string } | { full_name: string }[] | null
      liquidity_pools:
        | { name: string; currency: string }
        | { name: string; currency: string }[]
        | null
    }
    const p = r.persons
    const pool = r.liquidity_pools
    return {
      id: r.id,
      principal: r.principal,
      monthly_interest_rate: r.monthly_interest_rate,
      term_months: r.term_months,
      status: r.status,
      disbursed_at: r.disbursed_at,
      persons: Array.isArray(p) ? p[0] ?? null : p ?? null,
      liquidity_pools: Array.isArray(pool) ? pool[0] ?? null : pool ?? null,
    }
  })

  return (
    <PrestamosPanel
      loans={list}
      persons={persons ?? []}
      pools={pools ?? []}
      errorMessage={error?.message ?? null}
      initialOpenCreate={sp.nueva === "1"}
    />
  )
}
