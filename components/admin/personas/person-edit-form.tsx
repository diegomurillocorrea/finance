"use client"

import { DuiDocumentNumberField } from "@/components/dui-document-number-field"
import type { BankRow, PersonRow } from "@/lib/database.types"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { updatePerson } from "@/lib/actions/persons"
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
  selectClass,
} from "@/lib/form-classes"

interface PersonEditFormProps {
  person: PersonRow
  banks: Pick<BankRow, "id" | "name">[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function PersonEditForm({ person, banks, onSuccess, onCancel }: PersonEditFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set("id", person.id)
    startTransition(async () => {
      const result = await updatePerson(fd)
      if (result.ok) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
        }
        return
      }
      setError(result.message)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <input type="hidden" name="id" value={person.id} />

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="edit_full_name" className={labelClass}>
          Nombre completo
        </label>
        <input
          id="edit_full_name"
          name="full_name"
          required
          defaultValue={person.full_name}
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="edit_email" className={labelClass}>
          Email
        </label>
        <input
          id="edit_email"
          name="email"
          type="email"
          defaultValue={person.email ?? ""}
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="edit_phone" className={labelClass}>
          Teléfono
        </label>
        <input
          id="edit_phone"
          name="phone"
          type="tel"
          defaultValue={person.phone ?? ""}
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 tablet:grid-cols-2">
        <div>
          <label htmlFor="edit_document_type" className={labelClass}>
            Tipo documento
          </label>
          <select
            id="edit_document_type"
            name="document_type"
            className={selectClass}
            disabled={isPending}
            defaultValue="DUI"
            aria-label="Tipo de documento"
          >
            <option value="DUI">DUI</option>
          </select>
        </div>
        <div>
          <label htmlFor="edit_document_number" className={labelClass}>
            Número de documento
          </label>
          <DuiDocumentNumberField
            id="edit_document_number"
            inputClass={inputClass}
            defaultValue={person.document_number}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 tablet:grid-cols-2">
        <div>
          <label htmlFor="edit_bank_id" className={labelClass}>
            Banco
          </label>
          <select
            id="edit_bank_id"
            name="bank_id"
            className={selectClass}
            disabled={isPending}
            defaultValue={person.bank_id ?? ""}
            aria-label="Banco de la cuenta de ahorros"
          >
            <option value="">Sin cuenta bancaria</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {!banks.length ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Registra bancos en Administración → Bancos para poder asociarlos aquí.
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="edit_bank_account_number" className={labelClass}>
            Cuenta de banco
          </label>
          <input
            id="edit_bank_account_number"
            name="bank_account_number"
            type="text"
            autoComplete="off"
            placeholder="Número de cuenta de ahorros"
            defaultValue={person.bank_account_number ?? ""}
            className={inputClass}
            disabled={isPending}
            aria-describedby="edit_bank_account_number_hint"
          />
          <p
            id="edit_bank_account_number_hint"
            className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
          >
            Opcional. Si la completas, elige también el banco.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="edit_status" className={labelClass}>
          Estado
        </label>
        <select
          id="edit_status"
          name="status"
          defaultValue={person.status}
          className={selectClass}
          disabled={isPending}
        >
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="edit_is_member"
          name="is_member"
          type="checkbox"
          defaultChecked={person.is_member}
          value="true"
          className="h-4 w-4 rounded border-zinc-300 accent-emerald-600 dark:border-zinc-600"
          disabled={isPending}
        />
        <label htmlFor="edit_is_member" className="text-sm text-zinc-700 dark:text-zinc-300">
          Miembro (puede ahorrar)
        </label>
      </div>

      <div>
        <label htmlFor="edit_notes" className={labelClass}>
          Notas
        </label>
        <textarea
          id="edit_notes"
          name="notes"
          rows={3}
          defaultValue={person.notes ?? ""}
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={buttonSecondaryClass}
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  )
}
