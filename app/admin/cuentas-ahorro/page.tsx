import Link from "next/link"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import {
  buttonPrimaryClass,
  cardClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

type AccountListRow = {
  id: string
  status: string
  currency: string
  opened_at: string
  persons: { full_name: string } | null
  liquidity_pools: { name: string } | null
}

export default async function CuentasAhorroPage() {
  const { supabase } = await getAdminSupabaseOrRedirect()

  const { data: accounts, error } = await supabase
    .from("savings_accounts")
    .select(
      `
      id,
      status,
      currency,
      opened_at,
      persons (full_name),
      liquidity_pools (name)
    `
    )
    .order("opened_at", { ascending: false })

  const list: AccountListRow[] = (accounts ?? []).map((row) => {
    const r = row as {
      id: string
      status: string
      currency: string
      opened_at: string
      persons: { full_name: string } | { full_name: string }[] | null
      liquidity_pools: { name: string } | { name: string }[] | null
    }
    const p = r.persons
    const pool = r.liquidity_pools
    return {
      id: r.id,
      status: r.status,
      currency: r.currency,
      opened_at: r.opened_at,
      persons: Array.isArray(p) ? p[0] ?? null : p ?? null,
      liquidity_pools: Array.isArray(pool) ? pool[0] ?? null : pool ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Cuentas de ahorro
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Cada cuenta está ligada a una persona y al fondo al que aporta
            liquidez.
          </p>
        </div>
        <Link href="/admin/cuentas-ahorro/nuevo" className={buttonPrimaryClass}>
          Nueva cuenta
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : null}

      <section className={cardClass}>
        {!list.length ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No hay cuentas. Crea personas y fondos primero.
          </p>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Persona</th>
                  <th className={thClass}>Fondo</th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass}>Apertura</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {list.map((a) => (
                  <tr key={a.id}>
                    <td className={tdClass}>
                      {a.persons?.full_name ?? "—"}
                    </td>
                    <td className={tdClass}>
                      {a.liquidity_pools?.name ?? "—"}
                    </td>
                    <td className={tdClass}>{a.status}</td>
                    <td className={`${tdClass} tabular-nums text-zinc-600`}>
                      {new Date(a.opened_at).toLocaleDateString("es-MX")}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Link
                        href={`/admin/cuentas-ahorro/${a.id}`}
                        className="font-medium text-emerald-600 dark:text-emerald-400"
                      >
                        Ver / movimientos
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
