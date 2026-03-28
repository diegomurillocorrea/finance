import Link from "next/link"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import { formatMoney, toNumber } from "@/lib/format/money"
import {
  cardClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

type MovementRow = {
  id: string
  type: string
  amount: string
  occurred_at: string
  description: string | null
  liquidity_pools: { name: string; currency: string } | null
}

export default async function MovimientosFondoPage() {
  const { supabase } = await getAdminSupabaseOrRedirect()

  const { data: movements, error } = await supabase
    .from("pool_movements")
    .select(
      `
      id,
      type,
      amount,
      occurred_at,
      description,
      liquidity_pools (name, currency)
    `
    )
    .order("occurred_at", { ascending: false })
    .limit(100)

  const list: MovementRow[] = (movements ?? []).map((row) => {
    const r = row as {
      id: string
      type: string
      amount: string
      occurred_at: string
      description: string | null
      liquidity_pools:
        | { name: string; currency: string }
        | { name: string; currency: string }[]
        | null
    }
    const pool = r.liquidity_pools
    return {
      id: r.id,
      type: r.type,
      amount: r.amount,
      occurred_at: r.occurred_at,
      description: r.description,
      liquidity_pools: Array.isArray(pool) ? pool[0] ?? null : pool ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/fondos"
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
        >
          ← Fondos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Movimientos del fondo
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Últimos 100 movimientos que afectan la liquidez (depósitos, retiros,
          desembolsos y cobros).
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : null}

      <section className={cardClass}>
        {!list.length ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No hay movimientos registrados.
          </p>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Fecha</th>
                  <th className={thClass}>Fondo</th>
                  <th className={thClass}>Tipo</th>
                  <th className={thClass}>Monto</th>
                  <th className={thClass}>Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {list.map((m) => {
                  const cur = m.liquidity_pools?.currency ?? "MXN"
                  return (
                    <tr key={m.id}>
                      <td className={`${tdClass} whitespace-nowrap text-zinc-600`}>
                        {new Date(m.occurred_at).toLocaleString("es-MX")}
                      </td>
                      <td className={tdClass}>{m.liquidity_pools?.name ?? "—"}</td>
                      <td className={tdClass}>{m.type}</td>
                      <td className={`${tdClass} tabular-nums font-medium`}>
                        {formatMoney(toNumber(m.amount), cur)}
                      </td>
                      <td className={tdClass}>{m.description ?? "—"}</td>
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
