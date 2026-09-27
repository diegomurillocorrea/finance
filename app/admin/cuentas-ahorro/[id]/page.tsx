import Link from "next/link"
import { notFound } from "next/navigation"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import { getSavingsAccountBalance } from "@/lib/actions/balances"
import { labelSavingsAccountStatus } from "@/lib/constants/labels-es"
import { formatMoney } from "@/lib/format/money"
import type { SavingsAccountRow } from "@/lib/database.types"
import { cardClass } from "@/lib/form-classes"
import { AccountActions, CloseAccountAction } from "./account-actions"
import { SavingsTransactionsTable } from "@/components/admin/cuentas-ahorro/savings-transactions-table"

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
  const isActive = account.status === "active"

  const balance = await getSavingsAccountBalance(supabase, id)

  const { data: txs } = await supabase
    .from("savings_transactions")
    .select("*")
    .eq("account_id", id)
    .order("occurred_at", { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-linear-to-br from-emerald-50 via-white to-white p-6 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-zinc-900 dark:to-zinc-900 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/10"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin/cuentas-ahorro"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <span aria-hidden="true">←</span>
              Ahorrantes
            </Link>
            <span
              className={
                isActive
                  ? "inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                  : "inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-zinc-400"}`}
              />
              {labelSavingsAccountStatus(account.status)}
            </span>
          </div>

          <h1 className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            <span>Cuenta de ahorro</span>
            <span aria-hidden="true" className="hidden text-zinc-300 sm:inline dark:text-zinc-700">
              /
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {account.persons?.full_name ?? "Persona"}
            </span>
          </h1>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-1.5 text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
              Fondo:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {account.liquidity_pools?.name ?? "—"}
              </span>
            </span>
            <span className="rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-1.5 font-medium text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200">
              USD
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className={`${cardClass} relative overflow-hidden`}>
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1 bg-emerald-500"
          />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Saldo disponible
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums text-zinc-950 dark:text-zinc-50">
            {formatMoney(balance)}
          </p>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Actualizado con los movimientos registrados
          </p>
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Operaciones
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Registra entradas o salidas de esta cuenta.
          </p>
          <div className="mt-5">
            <AccountActions accountId={id} isActive={isActive} balance={balance} />
          </div>
        </section>
      </div>

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Movimientos recientes
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Historial de depósitos y retiros de la cuenta.
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {txs?.length ?? 0} movimientos
          </span>
        </div>
        {!txs?.length ? (
          <div className="mt-5 rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Sin movimientos aún
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Los depósitos y retiros aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="mt-5">
            <SavingsTransactionsTable rows={txs} isActive={isActive} />
          </div>
        )}
      </section>

      <CloseAccountAction accountId={id} isActive={isActive} balance={balance} />
    </div>
  )
}
