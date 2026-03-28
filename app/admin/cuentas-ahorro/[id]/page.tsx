import Link from "next/link"
import { notFound } from "next/navigation"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import { getSavingsAccountBalance } from "@/lib/actions/balances"
import {
  labelSavingsAccountStatus,
  labelSavingsTransactionType,
} from "@/lib/constants/labels-es"
import { formatMoney } from "@/lib/format/money"
import type { SavingsAccountRow } from "@/lib/database.types"
import {
  cardClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"
import { AccountActions } from "./account-actions"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CuentaDetallePage({ params }: PageProps) {
  const { id } = await params
  const { supabase } = await getAdminSupabaseOrRedirect()

  const { data: raw, error } = await supabase
    .from("savings_accounts")
    .select(
      `
      *,
      persons (full_name, id),
      liquidity_pools (name, id)
    `
    )
    .eq("id", id)
    .single()

  if (error || !raw) notFound()

  const row = raw as SavingsAccountRow & {
    persons:
      | { full_name: string; id: string }
      | { full_name: string; id: string }[]
      | null
    liquidity_pools:
      | { name: string; id: string }
      | { name: string; id: string }[]
      | null
  }
  const personsRel = row.persons
  const poolsRel = row.liquidity_pools
  const account = {
    ...row,
    persons: Array.isArray(personsRel) ? personsRel[0] ?? null : personsRel,
    liquidity_pools: Array.isArray(poolsRel) ? poolsRel[0] ?? null : poolsRel,
  }

  const balance = await getSavingsAccountBalance(supabase, id)

  const { data: txs } = await supabase
    .from("savings_transactions")
    .select("*")
    .eq("account_id", id)
    .order("occurred_at", { ascending: false })
    .limit(40)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/cuentas-ahorro"
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
        >
          ← Cuentas de ahorro
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Cuenta de ahorro
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {account.persons?.full_name ?? "Persona"} · Fondo:{" "}
          {account.liquidity_pools?.name ?? "—"} · USD
        </p>
      </div>

      <section className={`${cardClass} flex flex-wrap items-end justify-between gap-4`}>
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Saldo</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatMoney(balance)}
          </p>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Estado:{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {labelSavingsAccountStatus(account.status)}
          </span>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Operaciones
        </h2>
        <div className="mt-4">
          <AccountActions
            accountId={id}
            isActive={account.status === "active"}
            balance={balance}
          />
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Movimientos recientes
        </h2>
        {!txs?.length ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Sin movimientos aún.</p>
        ) : (
          <div className={`${tableWrapClass} mt-4`}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Fecha</th>
                  <th className={thClass}>Tipo</th>
                  <th className={thClass}>Monto</th>
                  <th className={thClass}>Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td className={`${tdClass} tabular-nums text-zinc-600`}>
                      {new Date(t.occurred_at).toLocaleString("es-MX")}
                    </td>
                    <td className={tdClass}>{labelSavingsTransactionType(t.type)}</td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatMoney(Number(t.amount))}
                    </td>
                    <td className={tdClass}>{t.description ?? "—"}</td>
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
