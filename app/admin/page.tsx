import Link from "next/link"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import { getPoolBalance } from "@/lib/actions/balances"
import { formatMoney } from "@/lib/format/money"
import { cardClass } from "@/lib/form-classes"

const quickLinks = [
  { href: "/admin/personas", label: "Personas", desc: "Altas y edición" },
  { href: "/admin/bancos", label: "Bancos", desc: "Catálogo de bancos" },
  { href: "/admin/fondos", label: "Fondos", desc: "Liquidez y saldos" },
  { href: "/admin/cuentas-ahorro", label: "Ahorrantes", desc: "Depósitos y retiros" },
  { href: "/admin/prestamos", label: "Préstamos", desc: "Desembolsos y pagos" },
  { href: "/admin/movimientos-fondo", label: "Mov. fondo", desc: "Auditoría de caja" },
] as const

export default async function AdminHomePage() {
  const { supabase } = await getAdminSupabaseOrRedirect()

  const [
    { data: pools, error: poolsError },
    { count: personsCount, error: personsError },
    { count: loansCount, error: loansError },
    { count: accountsCount, error: accountsError },
    { count: activeLoansCount, error: activeLoansError },
  ] = await Promise.all([
    supabase
      .from("liquidity_pools")
      .select("id, name, is_default")
      .order("is_default", { ascending: false }),
    supabase.from("persons").select("*", { count: "exact", head: true }),
    supabase.from("loans").select("*", { count: "exact", head: true }),
    supabase
      .from("savings_accounts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("loans")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ])

  const dataError =
    poolsError ?? personsError ?? loansError ?? accountsError ?? activeLoansError
  const errorMessage = dataError?.message ?? null

  const poolBalances: { id: string; name: string; balance: number }[] = []
  if (pools?.length) {
    for (const p of pools) {
      const balance = await getPoolBalance(supabase, p.id)
      poolBalances.push({
        id: p.id,
        name: p.name,
        balance,
      })
    }
  }

  return (
    <div className="space-y-6 tablet:space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:text-3xl">
          Panel Finance
        </h1>
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 tablet:text-base">
          Resumen operativo: ahorro, fondos y préstamos.
        </p>
      </header>

      {errorMessage ? (
        <section
          role="alert"
          className="rounded-2xl border border-amber-200/80 bg-amber-50 p-6 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 tablet:p-8"
        >
          <p className="font-medium">No se pudieron cargar algunos datos</p>
          <p className="mt-2 text-amber-900/90 dark:text-amber-200/90">{errorMessage}</p>
          <p className="mt-3 text-amber-900/80 dark:text-amber-200/80">
            Si usas RLS, ejecuta{" "}
            <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/60">
              supabase/migrations/20260327130000_rls_authenticated_mvp.sql
            </code>{" "}
            para el rol <code className="font-mono text-xs">authenticated</code>.
          </p>
        </section>
      ) : null}

      <section className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300/80 hover:bg-emerald-50/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
          >
            <span className="block font-semibold text-zinc-900 dark:text-zinc-50">
              {item.label}
            </span>
            <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
              {item.desc}
            </span>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-4 tablet:gap-6">
        <div className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Personas</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {personsCount ?? "—"}
          </p>
        </div>
        <div className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Cuentas activas
          </h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {accountsCount ?? "—"}
          </p>
        </div>
        <div className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Préstamos activos
          </h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {activeLoansCount ?? "—"}
          </p>
        </div>
        <div className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Préstamos (total)
          </h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {loansCount ?? "—"}
          </p>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Liquidez por fondo
        </h2>
        {!poolBalances.length && !errorMessage ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            No hay fondos. Crea uno en Fondos.
          </p>
        ) : null}
        {poolBalances.length > 0 ? (
          <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {poolBalances.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <Link
                  href="/admin/fondos"
                  className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {p.name}
                </Link>
                <span className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatMoney(p.balance)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
