import Link from "next/link"
import { notFound } from "next/navigation"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import {
  labelInstallmentStatus,
  labelLoanStatus,
  labelPaymentFrequency,
} from "@/lib/constants/labels-es"
import { formatMoney, toNumber } from "@/lib/format/money"
import {
  monthlyInterestOnOutstanding,
  outstandingPrincipal,
  totalPrincipalRepaidFromRows,
} from "@/lib/loan-balance"
import type {
  LoanInstallmentRow,
  LoanPaymentRow,
  LoanRow,
  PoolMovementRow,
} from "@/lib/database.types"
import {
  cardClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"
import { LoanDetailActions } from "./loan-detail-actions"
import { LoanPaymentsTable } from "@/components/admin/prestamos/loan-payments-table"
import { LoanDisbursementsTable } from "@/components/admin/prestamos/loan-disbursements-table"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PrestamoDetallePage({ params }: PageProps) {
  const { id } = await params
  const { supabase } = await getAdminSupabaseOrRedirect()

  const { data: raw, error } = await supabase
    .from("loans")
    .select(
      `
      *,
      persons!borrower_id (full_name),
      liquidity_pools (name, currency)
    `
    )
    .eq("id", id)
    .single()

  if (error || !raw) notFound()

  const row = raw as LoanRow & {
    persons: { full_name: string } | { full_name: string }[] | null
    liquidity_pools:
      | { name: string; currency: string }
      | { name: string; currency: string }[]
      | null
  }
  const pr = row.persons
  const pl = row.liquidity_pools
  const loan = {
    ...row,
    persons: Array.isArray(pr) ? pr[0] ?? null : pr,
    liquidity_pools: Array.isArray(pl) ? pl[0] ?? null : pl,
  }


  const { data: installments } = await supabase
    .from("loan_installments")
    .select("*")
    .eq("loan_id", id)
    .order("installment_number")

  const { data: allPayments } = await supabase
    .from("loan_payments")
    .select("*")
    .eq("loan_id", id)
    .order("paid_at", { ascending: false })

  const { data: disbursementRows } = await supabase
    .from("pool_movements")
    .select("id, amount, occurred_at, description")
    .eq("reference_loan_id", id)
    .eq("type", "loan_disbursement")
    .order("occurred_at", { ascending: true })

  const desembolsos = (disbursementRows ?? []) as Pick<
    PoolMovementRow,
    "id" | "amount" | "occurred_at" | "description"
  >[]
  const currencyCode = loan.liquidity_pools?.currency ?? undefined
  const cuotas = (installments ?? []) as LoanInstallmentRow[]
  const allPagos = (allPayments ?? []) as LoanPaymentRow[]
  const pagos = allPagos.slice(0, 100)

  const isDisbursed = Boolean(loan.disbursed_at)
  const totalPrincipalPaid = isDisbursed
    ? totalPrincipalRepaidFromRows(allPagos)
    : 0
  const saldoInsoluto = isDisbursed
    ? outstandingPrincipal(toNumber(loan.principal), totalPrincipalPaid)
    : 0
  const interesMensualSugerido =
    loan.status === "active" && saldoInsoluto > 0.01
      ? monthlyInterestOnOutstanding(saldoInsoluto, toNumber(loan.monthly_interest_rate))
      : 0

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/prestamos"
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
        >
          ← Préstamos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Préstamo — {loan.persons?.full_name ?? "Prestatario"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Fondo: {loan.liquidity_pools?.name ?? "—"} · Estado:{" "}
          <span className="font-medium">{labelLoanStatus(loan.status)}</span>
        </p>
      </div>

      <section className={`${cardClass} grid gap-4 tablet:grid-cols-3`}>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Capital prestado
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatMoney(toNumber(loan.principal))}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Tasa mensual</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {toNumber(loan.monthly_interest_rate).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Plazo referencial
          </p>
          <p className="mt-1 text-xl font-semibold">{loan.term_months} meses</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Frecuencia de pago</p>
          <p className="mt-1 text-xl font-semibold">
            {labelPaymentFrequency(loan.payment_frequency)}
          </p>
        </div>
        {loan.disbursed_at ? (
          <div className="tablet:col-span-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Desembolso</p>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
              {new Date(loan.disbursed_at).toLocaleString("es-MX")}
              {loan.maturity_date ? ` · Vencimiento: ${loan.maturity_date}` : null}
            </p>
          </div>
        ) : null}
        {loan.purpose ? (
          <div className="tablet:col-span-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Finalidad</p>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{loan.purpose}</p>
          </div>
        ) : null}
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Acciones</h2>
        <div className="mt-4">
          <LoanDetailActions
            loan={loan}
            outstandingPrincipal={saldoInsoluto}
            suggestedMonthlyInterest={interesMensualSugerido}
          />
        </div>
      </section>

      {isDisbursed ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Saldo insoluto
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            El interés mensual es la tasa sobre el capital pendiente. El prestatario puede
            pagar solo interés o interés más abono a capital; cada abono reduce el saldo y
            el interés del mes siguiente.
          </p>
          <dl className="mt-4 grid gap-3 tablet:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Capital pendiente
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatMoney(saldoInsoluto)}
              </dd>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Interés mensual sugerido (sobre saldo)
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {loan.status === "active" && saldoInsoluto > 0.01
                  ? formatMoney(interesMensualSugerido)
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {desembolsos.length > 0 ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Desembolsos
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Cada monto prestado a este préstamo. La suma es el capital prestado.
          </p>
          <div className="mt-4">
            <LoanDisbursementsTable
              rows={desembolsos}
              canEdit={loan.status === "active" || loan.status === "paid"}
              currencyCode={currencyCode}
            />
          </div>
        </section>
      ) : null}

      {cuotas.length > 0 ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Cuotas históricas (legado)
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Este préstamo tiene filas de cuotas antiguas; los nuevos pagos siguen el saldo
            insoluto y no dependen de esta tabla.
          </p>
          <div className={`${tableWrapClass} mt-4`}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>#</th>
                  <th className={thClass}>Vencimiento</th>
                  <th className={thClass}>Capital</th>
                  <th className={thClass}>Interés</th>
                  <th className={thClass}>Total</th>
                  <th className={thClass}>Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {cuotas.map((c) => (
                  <tr key={c.id}>
                    <td className={tdClass}>{c.installment_number}</td>
                    <td className={`${tdClass} tabular-nums`}>{c.due_date}</td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatMoney(toNumber(c.principal_due))}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatMoney(toNumber(c.interest_due))}
                    </td>
                    <td className={`${tdClass} tabular-nums font-medium`}>
                      {formatMoney(toNumber(c.total_due))}
                    </td>
                    <td className={tdClass}>{labelInstallmentStatus(c.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Historial de pagos
        </h2>
        {!pagos.length ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Sin pagos registrados.</p>
        ) : (
          <div className="mt-4">
            <LoanPaymentsTable
              rows={pagos}
              canEditPayments={loan.status === "active" || loan.status === "paid"}
              currencyCode={loan.liquidity_pools?.currency ?? undefined}
            />
          </div>
        )}
      </section>
    </div>
  )
}
