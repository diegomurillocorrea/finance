"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"
import type { BankRow } from "@/lib/database.types"
import { deleteBank } from "@/lib/actions/banks"
import { BankCreateForm } from "@/components/admin/bancos/bank-create-form"
import { BankEditForm } from "@/components/admin/bancos/bank-edit-form"
import { Modal } from "@/components/ui/modal"
import {
  buttonDangerClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

const formatCreatedAt = (iso: string) =>
  new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))

interface BancosPanelProps {
  banks: BankRow[]
  errorMessage: string | null
  initialOpenCreate?: boolean
  initialEditId?: string | null
}

export function BancosPanel({
  banks,
  errorMessage,
  initialOpenCreate = false,
  initialEditId = null,
}: BancosPanelProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<BankRow | null>(null)
  const [createFormKey, setCreateFormKey] = useState(0)
  const [bankToDelete, setBankToDelete] = useState<BankRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeletePending, startDeleteTransition] = useTransition()

  useEffect(() => {
    if (initialOpenCreate) {
      setCreateFormKey((k) => k + 1)
      setCreateOpen(true)
      router.replace("/admin/bancos", { scroll: false })
    }
  }, [initialOpenCreate, router])

  useEffect(() => {
    if (!initialEditId) return
    const b = banks.find((x) => x.id === initialEditId)
    if (b) {
      setEditingBank(b)
      setEditOpen(true)
    }
    router.replace("/admin/bancos", { scroll: false })
  }, [initialEditId, banks, router])

  const handleOpenCreate = useCallback(() => {
    setCreateFormKey((k) => k + 1)
    setCreateOpen(true)
  }, [])

  const handleCloseCreate = useCallback(() => {
    setCreateOpen(false)
  }, [])

  const handleCreateSuccess = useCallback(() => {
    setCreateOpen(false)
    router.replace("/admin/bancos", { scroll: false })
    router.refresh()
  }, [router])

  const handleOpenEdit = useCallback((b: BankRow) => {
    setEditingBank(b)
    setEditOpen(true)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setEditOpen(false)
    setEditingBank(null)
  }, [])

  const handleEditSuccess = useCallback(() => {
    setEditOpen(false)
    setEditingBank(null)
    router.replace("/admin/bancos", { scroll: false })
    router.refresh()
  }, [router])

  const handleOpenDelete = useCallback(
    (b: BankRow) => {
      if (editingBank?.id === b.id) {
        setEditOpen(false)
        setEditingBank(null)
      }
      setDeleteError(null)
      setBankToDelete(b)
    },
    [editingBank]
  )

  const handleCloseDeleteModal = useCallback(() => {
    if (isDeletePending) return
    setBankToDelete(null)
    setDeleteError(null)
  }, [isDeletePending])

  const handleConfirmDelete = useCallback(() => {
    if (!bankToDelete) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteBank(bankToDelete.id)
      if (result.ok) {
        setBankToDelete(null)
        router.replace("/admin/bancos", { scroll: false })
        router.refresh()
        return
      }
      setDeleteError(result.message)
    })
  }, [bankToDelete, router])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Bancos
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Catálogo con identificador, nombre y fecha de registro.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className={buttonPrimaryClass}
          aria-label="Registrar nuevo banco"
        >
          Nuevo banco
        </button>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <section className={cardClass}>
        {!banks.length ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No hay bancos registrados.
          </p>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Nombre</th>
                  <th className={thClass}>Creado</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {banks.map((b) => (
                  <tr key={b.id}>
                    <td className={`${tdClass} max-w-[140px]`}>
                      <span
                        className="block truncate font-mono text-xs text-zinc-600 dark:text-zinc-400"
                        title={b.id}
                      >
                        {b.id}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {b.name}
                      </span>
                    </td>
                    <td className={`${tdClass} text-sm text-zinc-600 dark:text-zinc-400`}>
                      {formatCreatedAt(b.created_at)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(b)}
                          className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(b)}
                          className="font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
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
        title="Nuevo banco"
        titleId="modal-nuevo-banco-title"
      >
        <BankCreateForm
          key={createFormKey}
          onSuccess={handleCreateSuccess}
          onCancel={handleCloseCreate}
        />
      </Modal>

      <Modal
        open={editOpen && editingBank !== null}
        onClose={handleCloseEdit}
        title="Editar banco"
        titleId="modal-editar-banco-title"
      >
        {editingBank ? (
          <BankEditForm
            key={editingBank.id}
            bank={editingBank}
            onSuccess={handleEditSuccess}
            onCancel={handleCloseEdit}
          />
        ) : null}
      </Modal>

      <Modal
        open={bankToDelete !== null}
        onClose={handleCloseDeleteModal}
        title="Eliminar banco"
        titleId="modal-eliminar-banco-title"
      >
        {bankToDelete ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ¿Eliminar{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {bankToDelete.name}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            {deleteError ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {deleteError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isDeletePending}
                className={buttonSecondaryClass}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletePending}
                className={buttonDangerClass}
              >
                {isDeletePending ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
