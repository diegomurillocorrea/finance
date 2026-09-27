"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Modal } from "@/components/ui/modal"
import { NewAccountForm } from "@/components/admin/cuentas-ahorro/new-account-form"
import { labelSavingsAccountStatus } from "@/lib/constants/labels-es"
import { formatMoney } from "@/lib/format/money"
import {
  buttonPrimaryClass,
  cardClass,
  inputClass,
  labelClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

export type CuentaListaRow = {
  id: string
  status: string
  opened_at: string
  balance: number
  persons: { full_name: string } | null
  liquidity_pools: { name: string } | null
}

type SortKey = "name" | "balance" | "opened"

function personInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatOpenedAt(value: string) {
  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function ariaSort(
  key: SortKey,
  current: SortKey,
  direction: "asc" | "desc"
): "ascending" | "descending" | "none" {
  if (key !== current) return "none"
  return direction === "asc" ? "ascending" : "descending"
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: "asc" | "desc"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 font-medium text-zinc-700 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-zinc-300 dark:hover:text-zinc-50"
      aria-label={`Ordenar por ${label}`}
    >
      {label}
      <span
        aria-hidden
        className={active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}
      >
        {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  )
}

interface SelectOption {
  id: string
  full_name?: string
  name?: string
  phone?: string | null
}

interface CuentasAhorroPanelProps {
  accounts: CuentaListaRow[]
  persons: SelectOption[]
  pools: SelectOption[]
  errorMessage: string | null
  initialOpenCreate?: boolean
}

export function CuentasAhorroPanel({
  accounts,
  persons,
  pools,
  errorMessage,
  initialOpenCreate = false,
}: CuentasAhorroPanelProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [createFormKey, setCreateFormKey] = useState(0)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const normalizedSearch = search.trim().toLowerCase()

  const visibleAccounts = useMemo(() => {
    const filtered = normalizedSearch
      ? accounts.filter((account) => {
          const name = account.persons?.full_name?.toLowerCase() ?? ""
          const pool = account.liquidity_pools?.name?.toLowerCase() ?? ""
          return name.includes(normalizedSearch) || pool.includes(normalizedSearch)
        })
      : accounts

    const direction = sortDir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === "balance") return (a.balance - b.balance) * direction
      if (sortKey === "opened") {
        return (new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime()) * direction
      }
      const nameA = a.persons?.full_name ?? ""
      const nameB = b.persons?.full_name ?? ""
      return nameA.localeCompare(nameB, "es") * direction
    })
  }, [accounts, normalizedSearch, sortDir, sortKey])

  const visibleTotal = useMemo(
    () => visibleAccounts.reduce((sum, account) => sum + account.balance, 0),
    [visibleAccounts]
  )

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
        return
      }
      setSortKey(key)
      setSortDir(key === "balance" ? "desc" : "asc")
    },
    [sortKey]
  )

  useEffect(() => {
    if (initialOpenCreate) {
      setCreateFormKey((k) => k + 1)
      setCreateOpen(true)
      router.replace("/admin/cuentas-ahorro", { scroll: false })
    }
  }, [initialOpenCreate, router])

  const handleOpenCreate = useCallback(() => {
    setCreateFormKey((k) => k + 1)
    setCreateOpen(true)
  }, [])

  const handleCloseCreate = useCallback(() => {
    setCreateOpen(false)
  }, [])

  const handleCreateSuccess = useCallback(
    (accountId: string) => {
      setCreateOpen(false)
      router.replace("/admin/cuentas-ahorro", { scroll: false })
      router.push(`/admin/cuentas-ahorro/${accountId}`)
      router.refresh()
    },
    [router]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Ahorrantes
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Cada cuenta está ligada a una persona y al fondo al que aporta
            liquidez. El saldo es la suma de sus movimientos.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className={buttonPrimaryClass}
          aria-label="Registrar nueva cuenta de ahorro"
        >
          Nueva cuenta
        </button>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <section className={cardClass}>
        {!accounts.length ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No hay cuentas. Registra miembros y fondos primero.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:justify-between">
              <div className="min-w-0 flex-1">
                <label htmlFor="cuentas-buscar" className={labelClass}>
                  Buscar
                </label>
                <input
                  id="cuentas-buscar"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nombre o fondo…"
                  className={inputClass}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  Saldo total
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-zinc-950 dark:text-zinc-50">
                  {formatMoney(visibleTotal)}
                </p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {visibleAccounts.length}{" "}
                  {visibleAccounts.length === 1 ? "cuenta" : "cuentas"}
                  {normalizedSearch ? " en esta búsqueda" : ""}
                </p>
              </div>
            </div>

            {!visibleAccounts.length ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No hay cuentas que coincidan con la búsqueda.
              </p>
            ) : (
              <div className={tableWrapClass}>
                <table className={tableClass}>
                  <caption className="sr-only">
                    Cuentas de ahorro con saldo actual
                  </caption>
                  <thead>
                    <tr>
                      <th className={thClass} scope="col" aria-sort={ariaSort("name", sortKey, sortDir)}>
                        <SortButton
                          label="Persona"
                          active={sortKey === "name"}
                          direction={sortDir}
                          onClick={() => handleSort("name")}
                        />
                      </th>
                      <th className={`${thClass} hidden tablet:table-cell`} scope="col">
                        Fondo
                      </th>
                      <th
                        className={thClass}
                        scope="col"
                        aria-sort={ariaSort("balance", sortKey, sortDir)}
                      >
                        <div className="flex justify-end">
                          <SortButton
                            label="Saldo actual"
                            active={sortKey === "balance"}
                            direction={sortDir}
                            onClick={() => handleSort("balance")}
                          />
                        </div>
                      </th>
                      <th className={thClass} scope="col">
                        Estado
                      </th>
                      <th
                        className={`${thClass} hidden tablet:table-cell`}
                        scope="col"
                        aria-sort={ariaSort("opened", sortKey, sortDir)}
                      >
                        <SortButton
                          label="Apertura"
                          active={sortKey === "opened"}
                          direction={sortDir}
                          onClick={() => handleSort("opened")}
                        />
                      </th>
                      <th className={thClass} scope="col">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {visibleAccounts.map((account) => {
                      const name = account.persons?.full_name ?? "—"
                      const poolName = account.liquidity_pools?.name ?? "—"
                      const isActive = account.status === "active"
                      return (
                        <tr
                          key={account.id}
                          className="transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40"
                        >
                          <td className={tdClass}>
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500/25 via-emerald-500/10 to-zinc-100 text-xs font-bold tracking-tight text-emerald-900 ring-1 ring-emerald-500/15 dark:from-emerald-400/20 dark:via-emerald-500/10 dark:to-zinc-800 dark:text-emerald-100 dark:ring-emerald-400/20"
                                aria-hidden
                              >
                                {personInitials(name === "—" ? "" : name)}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/cuentas-ahorro/${account.id}`}
                                  className="font-semibold text-zinc-900 hover:text-emerald-700 dark:text-zinc-50 dark:hover:text-emerald-300"
                                >
                                  {name}
                                </Link>
                                <p className="mt-0.5 text-xs text-zinc-500 tablet:hidden dark:text-zinc-400">
                                  {poolName}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className={`${tdClass} hidden text-zinc-600 tablet:table-cell dark:text-zinc-300`}>
                            {poolName}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            <span className="text-base font-semibold tabular-nums tracking-tight text-zinc-950 dark:text-zinc-50">
                              {formatMoney(account.balance)}
                            </span>
                          </td>
                          <td className={tdClass}>
                            <span
                              className={
                                isActive
                                  ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200"
                                  : "inline-flex rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                              }
                            >
                              {labelSavingsAccountStatus(account.status)}
                            </span>
                          </td>
                          <td
                            className={`${tdClass} hidden tabular-nums text-zinc-600 tablet:table-cell dark:text-zinc-400`}
                          >
                            {formatOpenedAt(account.opened_at)}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            <Link
                              href={`/admin/cuentas-ahorro/${account.id}`}
                              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                              aria-label={`Ver movimientos de ${name}`}
                            >
                              Ver / movimientos
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-800/40">
                      <td className={`${tdClass} font-medium text-zinc-700 dark:text-zinc-300`}>
                        Total
                      </td>
                      <td className={`${tdClass} hidden tablet:table-cell`} />
                      <td className={`${tdClass} text-right text-base font-bold tabular-nums text-zinc-950 dark:text-zinc-50`}>
                        {formatMoney(visibleTotal)}
                      </td>
                      <td className={tdClass} />
                      <td className={`${tdClass} hidden tablet:table-cell`} />
                      <td className={tdClass} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        onClose={handleCloseCreate}
        title="Nueva cuenta de ahorro"
        titleId="modal-nueva-cuenta-title"
      >
        <NewAccountForm
          key={createFormKey}
          persons={persons}
          pools={pools}
          onSuccess={handleCreateSuccess}
          onCancel={handleCloseCreate}
        />
      </Modal>
    </div>
  )
}
