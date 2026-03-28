"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"
import type { PersonRow } from "@/lib/database.types"
import { labelPersonStatus } from "@/lib/constants/labels-es"
import { deletePerson } from "@/lib/actions/persons"
import { PersonCreateForm } from "@/components/admin/personas/person-create-form"
import { PersonEditForm } from "@/components/admin/personas/person-edit-form"
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

interface PersonasPanelProps {
  persons: PersonRow[]
  errorMessage: string | null
  initialOpenCreate?: boolean
  initialEditId?: string | null
}

export function PersonasPanel({
  persons,
  errorMessage,
  initialOpenCreate = false,
  initialEditId = null,
}: PersonasPanelProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<PersonRow | null>(null)
  const [createFormKey, setCreateFormKey] = useState(0)
  const [personToDelete, setPersonToDelete] = useState<PersonRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeletePending, startDeleteTransition] = useTransition()

  useEffect(() => {
    if (initialOpenCreate) {
      setCreateFormKey((k) => k + 1)
      setCreateOpen(true)
      router.replace("/admin/personas", { scroll: false })
    }
  }, [initialOpenCreate, router])

  useEffect(() => {
    if (!initialEditId) return
    const p = persons.find((x) => x.id === initialEditId)
    if (p) {
      setEditingPerson(p)
      setEditOpen(true)
    }
    router.replace("/admin/personas", { scroll: false })
  }, [initialEditId, persons, router])

  const handleOpenCreate = useCallback(() => {
    setCreateFormKey((k) => k + 1)
    setCreateOpen(true)
  }, [])

  const handleCloseCreate = useCallback(() => {
    setCreateOpen(false)
  }, [])

  const handleCreateSuccess = useCallback(() => {
    setCreateOpen(false)
    router.replace("/admin/personas", { scroll: false })
    router.refresh()
  }, [router])

  const handleOpenEdit = useCallback((p: PersonRow) => {
    setEditingPerson(p)
    setEditOpen(true)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setEditOpen(false)
    setEditingPerson(null)
  }, [])

  const handleEditSuccess = useCallback(() => {
    setEditOpen(false)
    setEditingPerson(null)
    router.replace("/admin/personas", { scroll: false })
    router.refresh()
  }, [router])

  const handleOpenDeletePerson = useCallback((p: PersonRow) => {
    if (editingPerson?.id === p.id) {
      setEditOpen(false)
      setEditingPerson(null)
    }
    setDeleteError(null)
    setPersonToDelete(p)
  }, [editingPerson])

  const handleCloseDeleteModal = useCallback(() => {
    if (isDeletePending) return
    setPersonToDelete(null)
    setDeleteError(null)
  }, [isDeletePending])

  const handleConfirmDeletePerson = useCallback(() => {
    if (!personToDelete) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deletePerson(personToDelete.id)
      if (result.ok) {
        setPersonToDelete(null)
        router.replace("/admin/personas", { scroll: false })
        router.refresh()
        return
      }
      setDeleteError(result.message)
    })
  }, [personToDelete, router])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Personas
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Ahorradores y prestatarios. Puedes vincular la misma persona a cuenta
            de ahorro y préstamos.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className={buttonPrimaryClass}
          aria-label="Registrar nueva persona"
        >
          Nueva persona
        </button>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <section className={cardClass}>
        {!persons.length ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No hay personas. Crea la primera para comenzar.
          </p>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Nombre</th>
                  <th className={thClass}>Contacto</th>
                  <th className={thClass}>Documento</th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {persons.map((p) => (
                  <tr key={p.id}>
                    <td className={tdClass}>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {p.full_name}
                      </span>
                      {p.is_member ? (
                        <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                          miembro
                        </span>
                      ) : null}
                    </td>
                    <td className={tdClass}>
                      <div className="text-zinc-600 dark:text-zinc-400">{p.email ?? "—"}</div>
                      <div className="text-zinc-500 dark:text-zinc-500">{p.phone ?? ""}</div>
                    </td>
                    <td className={tdClass}>{p.document_number ?? "—"}</td>
                    <td className={tdClass}>
                      {labelPersonStatus(p.status)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeletePerson(p)}
                          className="font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          aria-label={`Eliminar a ${p.full_name}`}
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
        title="Nueva persona"
        titleId="modal-nueva-persona-title"
      >
        <PersonCreateForm
          key={createFormKey}
          onSuccess={handleCreateSuccess}
          onCancel={handleCloseCreate}
        />
      </Modal>

      <Modal
        open={editOpen && editingPerson !== null}
        onClose={handleCloseEdit}
        title="Editar persona"
        titleId="modal-editar-persona-title"
      >
        {editingPerson ? (
          <PersonEditForm
            key={editingPerson.id}
            person={editingPerson}
            onSuccess={handleEditSuccess}
            onCancel={handleCloseEdit}
          />
        ) : null}
      </Modal>

      <Modal
        open={personToDelete !== null}
        onClose={handleCloseDeleteModal}
        title="Eliminar persona"
        titleId="modal-eliminar-persona-title"
        panelClassName="max-w-md"
      >
        {personToDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              ¿Seguro que quieres eliminar a{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {personToDelete.full_name}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Solo es posible si la persona no tiene cuentas de ahorro ni préstamos registrados.
            </p>
            {deleteError ? (
              <div
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
              >
                {deleteError}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-2">
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
                onClick={handleConfirmDeletePerson}
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
