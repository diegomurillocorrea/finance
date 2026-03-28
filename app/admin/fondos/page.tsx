import Link from "next/link"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import { getPoolBalance } from "@/lib/actions/balances"
import { formatMoney } from "@/lib/format/money"
import {
  buttonPrimaryClass,
  cardClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

export default async function FondosPage() {
  const { supabase } = await getAdminSupabaseOrRedirect()

  const { data: pools, error } = await supabase
    .from("liquidity_pools")
    .select("id, name, currency, is_default")
    .order("name")

  const balances: Record<string, number> = {}
  if (pools) {
    for (const p of pools) {
      balances[p.id] = await getPoolBalance(supabase, p.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Fondos de liquidez
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Caja común desde la que se desembolsan préstamos. El saldo es la suma
            de movimientos del fondo.
          </p>
        </div>
        <Link href="/admin/fondos/nuevo" className={buttonPrimaryClass}>
          Nuevo fondo
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : null}

      <section className={cardClass}>
        {!pools?.length ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No hay fondos registrados.
          </p>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Nombre</th>
                  <th className={thClass}>Moneda</th>
                  <th className={thClass}>Saldo (movimientos)</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {pools.map((p) => (
                  <tr key={p.id}>
                    <td className={tdClass}>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {p.name}
                      </span>
                      {p.is_default ? (
                        <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                          predeterminado
                        </span>
                      ) : null}
                    </td>
                    <td className={tdClass}>{p.currency}</td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatMoney(balances[p.id] ?? 0, p.currency)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Link
                        href={`/admin/fondos/${p.id}/editar`}
                        className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      >
                        Editar
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
