import Link from "next/link"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import { labelPoolMovementType } from "@/lib/constants/labels-es"
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
  /** Prestatario o titular de la cuenta de ahorro asociada al movimiento */
  person_full_name: string | null
  /** Préstamo o cuenta de ahorro donde ver el movimiento en contexto */
  detailHref: string | null
}

function first<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? x[0] ?? null : x
}

function relatedPersonFullName(row: {
  loans:
    | { persons: { full_name: string } | { full_name: string }[] | null }
    | { persons: { full_name: string } | { full_name: string }[] | null }[]
    | null
  savings_transactions:
    | {
        savings_accounts: {
          persons: { full_name: string } | { full_name: string }[] | null
        } | {
          persons: { full_name: string } | { full_name: string }[] | null
        }[]
        | null
      }
    | {
        savings_accounts: {
          persons: { full_name: string } | { full_name: string }[] | null
        } | {
          persons: { full_name: string } | { full_name: string }[] | null
        }[]
        | null
      }[]
    | null
}): string | null {
  const loan = first(row.loans)
  if (loan) {
    const p = first(loan.persons)
    if (p?.full_name) return p.full_name
  }
  const st = first(row.savings_transactions)
  if (st) {
    const acc = first(st.savings_accounts)
    if (acc) {
      const p = first(acc.persons)
      if (p?.full_name) return p.full_name
    }
  }
  return null
}

function poolMovementDetailHref(row: {
  reference_loan_id: string | null
  reference_savings_transaction_id: string | null
  loans: unknown
  savings_transactions: unknown
}): string | null {
  const loanId =
    row.reference_loan_id ??
    first(row.loans as { id?: string } | { id?: string }[] | null)?.id
  if (loanId) return `/admin/prestamos/${loanId}`

  type StJoin = {
    account_id?: string
    savings_accounts?: { id?: string } | { id?: string }[] | null
  }
  const st = first(row.savings_transactions as StJoin | StJoin[] | null)
  if (!st) return null

  const accId = st.account_id || first(st.savings_accounts)?.id
  if (accId) return `/admin/cuentas-ahorro/${accId}`

  return null
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
      reference_loan_id,
      reference_savings_transaction_id,
      liquidity_pools (name, currency),
      loans!reference_loan_id (
        id,
        persons!borrower_id (full_name)
      ),
      savings_transactions!reference_savings_transaction_id (
        account_id,
        savings_accounts (
          id,
          persons (full_name)
        )
      )
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
      reference_loan_id: string | null
      reference_savings_transaction_id: string | null
      liquidity_pools:
        | { name: string; currency: string }
        | { name: string; currency: string }[]
        | null
      loans: Parameters<typeof relatedPersonFullName>[0]["loans"]
      savings_transactions: Parameters<
        typeof relatedPersonFullName
      >[0]["savings_transactions"]
    }
    const pool = r.liquidity_pools
    return {
      id: r.id,
      type: r.type,
      amount: r.amount,
      occurred_at: r.occurred_at,
      description: r.description,
      liquidity_pools: Array.isArray(pool) ? pool[0] ?? null : pool ?? null,
      person_full_name: relatedPersonFullName({
        loans: r.loans,
        savings_transactions: r.savings_transactions,
      }),
      detailHref: poolMovementDetailHref({
        reference_loan_id: r.reference_loan_id,
        reference_savings_transaction_id: r.reference_savings_transaction_id,
        loans: r.loans,
        savings_transactions: r.savings_transactions,
      }),
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
          desembolsos y cobros). La columna Persona indica al prestatario o al
          titular de la cuenta de ahorro involucrada.
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
                  <th className={thClass}>Persona</th>
                  <th className={thClass}>Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {list.map((m) => {
                  return (
                    <tr key={m.id}>
                      <td className={`${tdClass} whitespace-nowrap text-zinc-600`}>
                        {new Date(m.occurred_at).toLocaleString("es-MX")}
                      </td>
                      <td className={tdClass}>{m.liquidity_pools?.name ?? "—"}</td>
                      <td className={tdClass}>{labelPoolMovementType(m.type)}</td>
                      <td className={`${tdClass} tabular-nums font-medium`}>
                        {formatMoney(toNumber(m.amount))}
                      </td>
                      <td className={tdClass}>
                        {m.detailHref ? (
                          <Link
                            href={m.detailHref}
                            className="font-medium text-emerald-600 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-emerald-400"
                            aria-label={
                              m.person_full_name
                                ? `Ver préstamo o cuenta de ahorro de ${m.person_full_name}`
                                : "Ver detalle del movimiento"
                            }
                          >
                            {m.person_full_name ?? "Ver detalle"}
                          </Link>
                        ) : (
                          (m.person_full_name ?? "—")
                        )}
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
