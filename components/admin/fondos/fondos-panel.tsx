"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import type { LiquidityPoolRow } from "@/lib/database.types"
import { Modal } from "@/components/ui/modal"
import { PoolCreateForm } from "@/components/admin/fondos/pool-create-form"
import { PoolEditForm } from "@/components/admin/fondos/pool-edit-form"
import { formatMoney } from "@/lib/format/money"
import {
  buttonPrimaryClass,
  cardClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

export interface FondoListRow extends LiquidityPoolRow {
  balance: number
}

interface FondosPanelProps {
  pools: FondoListRow[]
  errorMessage: string | null
  initialOpenCreate?: boolean
  initialEditId?: string | null
}

export function FondosPanel({
  pools,
  errorMessage,
  initialOpenCreate = false,
  initialEditId = null,
}: FondosPanelProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingPool, setEditingPool] = useState<LiquidityPoolRow | null>(null)
  const [createFormKey, setCreateFormKey] = useState(0)

  useEffect(() => {
    if (initialOpenCreate) {
      setCreateFormKey((k) => k + 1)
      setCreateOpen(true)
      router.replace("/admin/fondos", { scroll: false })
    }
  }, [initialOpenCreate, router])

  useEffect(() => {
    if (!initialEditId) return
    const p = pools.find((x) => x.id === initialEditId)
    if (p) {
      setEditingPool(p)
      setEditOpen(true)
    }
    router.replace("/admin/fondos", { scroll: false })
  }, [initialEditId, pools, router])

  const handleOpenCreate = useCallback(() => {
    setCreateFormKey((k) => k + 1)
    setCreateOpen(true)
  }, [])

  const handleCloseCreate = useCallback(() => {
    setCreateOpen(false)
  }, [])

  const handleCreateSuccess = useCallback(() => {
    setCreateOpen(false)
    router.replace("/admin/fondos", { scroll: false })
    router.refresh()
  }, [router])

  const handleOpenEdit = useCallback((p: LiquidityPoolRow) => {
    setEditingPool(p)
    setEditOpen(true)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setEditOpen(false)
    setEditingPool(null)
  }, [])

  const handleEditSuccess = useCallback(() => {
    setEditOpen(false)
    setEditingPool(null)
    router.replace("/admin/fondos", { scroll: false })
    router.refresh()
  }, [router])

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
        <button
          type="button"
          onClick={handleOpenCreate}
          className={buttonPrimaryClass}
          aria-label="Crear nuevo fondo"
        >
          Nuevo fondo
        </button>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <section className={cardClass}>
        {!pools.length ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No hay fondos registrados.
          </p>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Nombre</th>
                  <th className={thClass}>Saldo (USD)</th>
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
                    <td className={`${tdClass} tabular-nums`}>
                      {formatMoney(p.balance ?? 0)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      >
                        Editar
                      </button>
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
        title="Nuevo fondo"
        titleId="modal-nuevo-fondo-title"
      >
        <PoolCreateForm
          key={createFormKey}
          onSuccess={handleCreateSuccess}
          onCancel={handleCloseCreate}
        />
      </Modal>

      <Modal
        open={editOpen && editingPool !== null}
        onClose={handleCloseEdit}
        title="Editar fondo"
        titleId="modal-editar-fondo-title"
      >
        {editingPool ? (
          <PoolEditForm
            key={editingPool.id}
            pool={editingPool}
            onSuccess={handleEditSuccess}
            onCancel={handleCloseEdit}
          />
        ) : null}
      </Modal>
    </div>
  )
}
