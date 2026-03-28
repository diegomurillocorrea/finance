"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import type { PersonRow } from "@/lib/database.types"
import { PersonCreateForm } from "@/components/admin/personas/person-create-form"
import { PersonEditForm } from "@/components/admin/personas/person-edit-form"
import { Modal } from "@/components/ui/modal"
import {
  buttonPrimaryClass,
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
                      {p.status === "active" ? "Activa" : "Inactiva"}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
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
    </div>
  )
}
