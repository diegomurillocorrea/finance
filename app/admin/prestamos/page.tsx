import Link from "next/link"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import { formatMoney, toNumber } from "@/lib/format/money"
import {
  buttonPrimaryClass,
  cardClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

type LoanRow = {
  id: string
  principal: string
  annual_interest_rate: string
  term_months: number
  status: string
  disbursed_at: string | null
  persons: { full_name: string } | null
  liquidity_pools: { name: string; currency: string } | null
}

export default async function PrestamosPage() {
  const { supabase } = await getAdminSupabaseOrRedirect()

  const { data: loans, error } = await supabase
    .from("loans")
    .select(
      `
      id,
      principal,
      annual_interest_rate,
      term_months,
      status,
      disbursed_at,
      persons!borrower_id (full_name),
      liquidity_pools (name, currency)
    `
    )
    .order("created_at", { ascending: false })

  const list: LoanRow[] = (loans ?? []).map((row) => {
    const r = row as {
      id: string
      principal: string
      annual_interest_rate: string
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
      annual_interest_rate: r.annual_interest_rate,
      term_months: r.term_months,
      status: r.status,
      disbursed_at: r.disbursed_at,
      persons: Array.isArray(p) ? p[0] ?? null : p ?? null,
      liquidity_pools: Array.isArray(pool) ? pool[0] ?? null : pool ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Préstamos</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Borradores, activos y liquidados. Desembolso genera el plan de cuotas.
          </p>
        </div>
        <Link href="/admin/prestamos/nuevo" className={buttonPrimaryClass}>
          Nuevo préstamo
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : null}

      <section className={cardClass}>
        {!list.length ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No hay préstamos.</p>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Prestatario</th>
                  <th className={thClass}>Monto</th>
                  <th className={thClass}>Tasa anual %</th>
                  <th className={thClass}>Plazo</th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {list.map((l) => {
                  const cur = l.liquidity_pools?.currency ?? "MXN"
                  return (
                    <tr key={l.id}>
                      <td className={tdClass}>{l.persons?.full_name ?? "—"}</td>
                      <td className={`${tdClass} tabular-nums`}>
                        {formatMoney(toNumber(l.principal), cur)}
                      </td>
                      <td className={`${tdClass} tabular-nums`}>
                        {toNumber(l.annual_interest_rate).toFixed(2)}%
                      </td>
                      <td className={tdClass}>{l.term_months} meses</td>
                      <td className={tdClass}>{l.status}</td>
                      <td className={`${tdClass} text-right`}>
                        <Link
                          href={`/admin/prestamos/${l.id}`}
                          className="font-medium text-emerald-600 dark:text-emerald-400"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
