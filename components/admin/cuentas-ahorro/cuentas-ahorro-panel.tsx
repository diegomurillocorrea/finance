"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Modal } from "@/components/ui/modal"
import { NewAccountForm } from "@/components/admin/cuentas-ahorro/new-account-form"
import { labelSavingsAccountStatus } from "@/lib/constants/labels-es"
import {
  buttonPrimaryClass,
  cardClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

export type CuentaListaRow = {
  id: string
  status: string
  opened_at: string
  persons: { full_name: string } | null
  liquidity_pools: { name: string } | null
}

interface SelectOption {
  id: string
  full_name?: string
  name?: string
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
            liquidez.
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
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className={tdClass}>{a.persons?.full_name ?? "—"}</td>
                    <td className={tdClass}>{a.liquidity_pools?.name ?? "—"}</td>
                    <td className={tdClass}>{labelSavingsAccountStatus(a.status)}</td>
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
