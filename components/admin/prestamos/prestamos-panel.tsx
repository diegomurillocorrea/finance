"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Modal } from "@/components/ui/modal"
import { NewLoanForm } from "@/components/admin/prestamos/new-loan-form"
import { labelLoanStatus } from "@/lib/constants/labels-es"
import { formatMoney, toNumber } from "@/lib/format/money"
import {
  buttonPrimaryClass,
  cardClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

export type PrestamoListaRow = {
  id: string
  principal: string
  monthly_interest_rate: string
  term_months: number
  status: string
  disbursed_at: string | null
  persons: { full_name: string } | null
  liquidity_pools: { name: string; currency: string } | null
}

interface SelectOption {
  id: string
  full_name?: string
  name?: string
}

interface PrestamosPanelProps {
  loans: PrestamoListaRow[]
  persons: SelectOption[]
  pools: SelectOption[]
  errorMessage: string | null
  initialOpenCreate?: boolean
}

export function PrestamosPanel({
  loans,
  persons,
  pools,
  errorMessage,
  initialOpenCreate = false,
}: PrestamosPanelProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [createFormKey, setCreateFormKey] = useState(0)

  useEffect(() => {
    if (initialOpenCreate) {
      setCreateFormKey((k) => k + 1)
      setCreateOpen(true)
      router.replace("/admin/prestamos", { scroll: false })
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
    (loanId: string) => {
      setCreateOpen(false)
      router.replace("/admin/prestamos", { scroll: false })
      router.push(`/admin/prestamos/${loanId}`)
      router.refresh()
    },
    [router]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Préstamos</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Borradores, activos y liquidados. Interés mensual sobre saldo insoluto; abonos a
            capital opcionales.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className={buttonPrimaryClass}
          aria-label="Registrar nuevo préstamo"
        >
          Nuevo préstamo
        </button>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <section className={cardClass}>
        {!loans.length ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No hay préstamos.</p>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Prestatario</th>
                  <th className={thClass}>Monto</th>
                  <th className={thClass}>Tasa mensual %</th>
                  <th className={thClass}>Plazo</th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {loans.map((l) => {
                  return (
                    <tr key={l.id}>
                      <td className={tdClass}>{l.persons?.full_name ?? "—"}</td>
                      <td className={`${tdClass} tabular-nums`}>
                        {formatMoney(toNumber(l.principal))}
                      </td>
                      <td className={`${tdClass} tabular-nums`}>
                        {toNumber(l.monthly_interest_rate).toFixed(2)}%
                      </td>
                      <td className={tdClass}>{l.term_months} meses</td>
                      <td className={tdClass}>{labelLoanStatus(l.status)}</td>
                      <td className={`${tdClass} text-right`}>
                        <Link
                          href={`/admin/prestamos/${l.id}`}
                          className="font-medium text-emerald-600 dark:text-emerald-400"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        onClose={handleCloseCreate}
        title="Nuevo préstamo"
        titleId="modal-nuevo-prestamo-title"
        panelClassName="max-w-xl"
      >
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Se guarda como borrador hasta que desembolses desde el detalle.
        </p>
        <NewLoanForm
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
