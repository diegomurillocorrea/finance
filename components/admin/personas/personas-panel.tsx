"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import type { BankRow, PersonRow } from "@/lib/database.types"
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
  inputClass,
  labelClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

function personInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function digitsForTel(phone: string) {
  return phone.replace(/\D/g, "")
}

function bankAccountDisplay(raw: string) {
  const t = raw.trim()
  if (!t) return ""
  if (t.length <= 6) return t
  return `${t.slice(0, 2)}···${t.slice(-4)}`
}

function personBankCaption(
  p: PersonRow,
  bankNameById: Map<string, string>
): string | null {
  const bankName = p.bank_id ? bankNameById.get(p.bank_id) : undefined
  const accDisp = p.bank_account_number ? bankAccountDisplay(p.bank_account_number) : ""
  if (bankName && accDisp) return `${bankName} · ${accDisp}`
  if (bankName) return bankName
  if (accDisp) return `Cuenta · ${accDisp}`
  return null
}

interface PersonasPanelProps {
  persons: PersonRow[]
  banks: Pick<BankRow, "id" | "name">[]
  errorMessage: string | null
  initialOpenCreate?: boolean
  initialEditId?: string | null
}

export function PersonasPanel({
  persons,
  banks,
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
  const [search, setSearch] = useState("")

  const normalizedSearch = search.trim().toLowerCase()

  const bankNameById = useMemo(
    () => new Map(banks.map((b) => [b.id, b.name] as const)),
    [banks]
  )

  const filteredPersons = useMemo(() => {
    if (!normalizedSearch) return persons
    return persons.filter((p) => {
      const bankLine = personBankCaption(p, bankNameById)
      const haystack = [
        p.full_name,
        p.phone,
        p.notes,
        p.bank_account_number,
        bankLine,
        labelPersonStatus(p.status),
        p.status,
        p.is_member ? "miembro" : "no miembro",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [persons, normalizedSearch, bankNameById])

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
          <div className="space-y-4">
            <div>
              <label htmlFor="personas-buscar" className={labelClass}>
                Buscar
              </label>
              <input
                id="personas-buscar"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, teléfono, banco, notas…"
                className={inputClass}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {!filteredPersons.length ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No hay personas que coincidan con la búsqueda.
              </p>
            ) : (
              <div className={tableWrapClass}>
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Persona</th>
                      <th className={`${thClass} hidden tablet:table-cell`}>Teléfono</th>
                      <th className={thClass}>Estado</th>
                      <th className={thClass} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredPersons.map((p) => {
                      const bankCaption = personBankCaption(p, bankNameById)
                      const phoneRaw = p.phone?.trim() ?? ""
                      const telDigits = phoneRaw ? digitsForTel(phoneRaw) : ""
                      const telHref = telDigits.length ? `tel:${telDigits}` : null
                      const statusActive = p.status === "active"
                      return (
                        <tr
                          key={p.id}
                          className="transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40"
                        >
                          <td className={`${tdClass} max-w-[min(100vw,22rem)] tablet:max-w-md`}>
                            <div className="flex gap-3">
                              <div
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500/25 via-emerald-500/10 to-zinc-100 text-xs font-bold tracking-tight text-emerald-900 shadow-sm ring-1 ring-emerald-500/15 dark:from-emerald-400/20 dark:via-emerald-500/10 dark:to-zinc-800 dark:text-emerald-100 dark:ring-emerald-400/20"
                                aria-hidden
                              >
                                {personInitials(p.full_name)}
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                                    {p.full_name}
                                  </span>
                                  {p.is_member ? (
                                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300">
                                      Miembro
                                    </span>
                                  ) : (
                                    <span className="shrink-0 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                                      No miembro
                                    </span>
                                  )}
                                </div>
                                {bankCaption ? (
                                  <p className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                                    {bankCaption}
                                  </p>
                                ) : null}
                                {p.notes?.trim() ? (
                                  <p
                                    className="line-clamp-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400"
                                    title={p.notes.trim()}
                                  >
                                    {p.notes.trim()}
                                  </p>
                                ) : null}
                                {phoneRaw ? (
                                  <p className="text-xs text-zinc-500 tablet:hidden dark:text-zinc-400">
                                    {telHref ? (
                                      <a
                                        href={telHref}
                                        className="font-mono text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:decoration-emerald-600 dark:text-emerald-400 dark:decoration-emerald-400/30"
                                      >
                                        {phoneRaw}
                                      </a>
                                    ) : (
                                      <span className="font-mono">{phoneRaw}</span>
                                    )}
                                  </p>
                                ) : (
                                  <p className="text-xs text-zinc-400 tablet:hidden dark:text-zinc-500">
                                    Sin teléfono
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td
                            className={`${tdClass} hidden align-top text-sm tablet:table-cell`}
                          >
                            {phoneRaw ? (
                              telHref ? (
                                <a
                                  href={telHref}
                                  className="font-mono text-emerald-700 tabular-nums hover:underline dark:text-emerald-400"
                                >
                                  {phoneRaw}
                                </a>
                              ) : (
                                <span className="font-mono text-zinc-700 tabular-nums dark:text-zinc-200">
                                  {phoneRaw}
                                </span>
                              )
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500">—</span>
                            )}
                          </td>
                          <td className={`${tdClass} align-top`}>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                statusActive
                                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200"
                                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                              }`}
                            >
                              {labelPersonStatus(p.status)}
                            </span>
                          </td>
                          <td className={`${tdClass} text-right align-top`}>
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
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
          banks={banks}
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
            banks={banks}
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
