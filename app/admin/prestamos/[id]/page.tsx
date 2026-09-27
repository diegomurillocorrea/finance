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
import { CancelLoanAction, DeleteLoanAction, LoanDetailActions } from "./loan-detail-actions"
import { LoanPaymentsTable } from "@/components/admin/prestamos/loan-payments-table"
import { LoanDisbursementsTable } from "@/components/admin/prestamos/loan-disbursements-table"

interface PageProps {
  params: Promise<{ id: string }>
}

const metaChipClass =
  "rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-1.5 text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300"

const statTileClass =
  "rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40"

function loanStatusBadgeClass(status: string): string {
  if (status === "active" || status === "paid") {
    return "inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
  }
  if (status === "defaulted") {
    return "inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-100/80 px-3 py-1.5 text-xs font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/70 dark:text-red-300"
  }
  return "inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
}

function loanStatusDotClass(status: string): string {
  if (status === "active" || status === "paid") return "h-2 w-2 rounded-full bg-emerald-500"
  if (status === "defaulted") return "h-2 w-2 rounded-full bg-red-500"
  return "h-2 w-2 rounded-full bg-zinc-400"
}

function SectionHeading({
  title,
  description,
  countLabel,
}: {
  title: string
  description: string
  countLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        {countLabel}
      </span>
    </div>
  )
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  )
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
  const isDraft = loan.status === "draft" || loan.status === "pending_approval"
  const heroAmount = isDisbursed ? saldoInsoluto : toNumber(loan.principal)
  const heroLabel = isDisbursed ? "Saldo insoluto" : "Capital a desembolsar"
  const operationsHint = isDraft
    ? "Edita el borrador o desembolsa para activar el préstamo."
    : loan.status === "active"
      ? "Registra abonos o suma capital a este préstamo."
      : loan.status === "paid"
        ? "Puedes prestar un monto nuevo sobre este préstamo liquidado."
        : "No hay operaciones disponibles en este estado."

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
              href="/admin/prestamos"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <span aria-hidden="true">←</span>
              Préstamos
            </Link>
            <span className={loanStatusBadgeClass(loan.status)}>
              <span aria-hidden="true" className={loanStatusDotClass(loan.status)} />
              {labelLoanStatus(loan.status)}
            </span>
          </div>

          <h1 className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            <span>Préstamo</span>
            <span aria-hidden="true" className="hidden text-zinc-300 sm:inline dark:text-zinc-700">
              /
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {loan.persons?.full_name ?? "Prestatario"}
            </span>
          </h1>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className={metaChipClass}>
              Fondo:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {loan.liquidity_pools?.name ?? "—"}
              </span>
            </span>
            <span className={`${metaChipClass} font-medium text-zinc-700 dark:text-zinc-200`}>
              {currencyCode ?? "USD"}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className={`${cardClass} relative overflow-hidden`}>
          <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{heroLabel}</p>
          <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums text-zinc-950 dark:text-zinc-50">
            {formatMoney(heroAmount, currencyCode)}
          </p>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            {isDisbursed
              ? loan.status === "active" && saldoInsoluto > 0.01
                ? `Interés mensual sugerido: ${formatMoney(interesMensualSugerido, currencyCode)}. Cada abono a capital reduce el saldo y el interés del mes siguiente.`
                : "Capital pendiente después de los abonos registrados."
              : "Este préstamo aún no se ha desembolsado."}
          </p>
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Operaciones</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{operationsHint}</p>
          <div className="mt-5">
            <LoanDetailActions
              loan={loan}
              outstandingPrincipal={saldoInsoluto}
              suggestedMonthlyInterest={interesMensualSugerido}
            />
          </div>
        </section>
      </div>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Condiciones</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Capital, tasa y plazo acordados para este préstamo.
        </p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={statTileClass}>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Capital prestado</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatMoney(toNumber(loan.principal), currencyCode)}
            </dd>
          </div>
          <div className={statTileClass}>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tasa mensual</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {toNumber(loan.monthly_interest_rate).toFixed(2)}%
            </dd>
          </div>
          <div className={statTileClass}>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Plazo referencial</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {loan.term_months} meses
            </dd>
          </div>
          <div className={statTileClass}>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Frecuencia de pago</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {labelPaymentFrequency(loan.payment_frequency)}
            </dd>
          </div>
        </dl>
        {loan.disbursed_at || loan.purpose ? (
          <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {loan.disbursed_at ? (
              <p>
                Desembolso:{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {new Date(loan.disbursed_at).toLocaleString("es-MX")}
                </span>
                {loan.maturity_date ? (
                  <>
                    {" "}
                    · Vencimiento:{" "}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {loan.maturity_date}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
            {loan.purpose ? (
              <p>
                Finalidad:{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{loan.purpose}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={cardClass}>
        <SectionHeading
          title="Desembolsos"
          description="Cada monto prestado a este préstamo. La suma es el capital prestado."
          countLabel={formatCount(desembolsos.length, "desembolso", "desembolsos")}
        />
        {!desembolsos.length ? (
          <EmptyState
            title="Sin desembolsos aún"
            description="El desembolso inicial y los montos agregados aparecerán aquí."
          />
        ) : (
          <div className="mt-5">
            <LoanDisbursementsTable
              rows={desembolsos}
              canEdit={loan.status === "active" || loan.status === "paid"}
              currencyCode={currencyCode}
            />
          </div>
        )}
      </section>

      {cuotas.length > 0 ? (
        <section className={cardClass}>
          <SectionHeading
            title="Cuotas históricas"
            description="Filas de cuotas antiguas. Los pagos nuevos siguen el saldo insoluto y no dependen de esta tabla."
            countLabel={formatCount(cuotas.length, "cuota", "cuotas")}
          />
          <div className={`${tableWrapClass} mt-5`}>
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
                      {formatMoney(toNumber(c.principal_due), currencyCode)}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatMoney(toNumber(c.interest_due), currencyCode)}
                    </td>
                    <td className={`${tdClass} tabular-nums font-medium`}>
                      {formatMoney(toNumber(c.total_due), currencyCode)}
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
        <SectionHeading
          title="Historial de pagos"
          description="Abonos de interés y capital registrados en este préstamo."
          countLabel={formatCount(pagos.length, "pago", "pagos")}
        />
        {!pagos.length ? (
          <EmptyState
            title="Sin pagos aún"
            description="Los abonos de interés y capital aparecerán aquí."
          />
        ) : (
          <div className="mt-5">
            <LoanPaymentsTable
              rows={pagos}
              canEditPayments={loan.status === "active" || loan.status === "paid"}
              currencyCode={currencyCode}
            />
          </div>
        )}
      </section>

      <CancelLoanAction loanId={id} isDraft={isDraft} />

      <DeleteLoanAction
        loanId={id}
        borrowerName={loan.persons?.full_name ?? "este prestatario"}
      />
    </div>
  )
}
