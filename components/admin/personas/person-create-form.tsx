"use client"

import type { BankRow } from "@/lib/database.types"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { createPerson } from "@/lib/actions/persons"
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
  selectClass,
} from "@/lib/form-classes"

export interface PersonCreateFormProps {
  banks: Pick<BankRow, "id" | "name">[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function PersonCreateForm({ banks, onSuccess, onCancel }: PersonCreateFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    startTransition(async () => {
      const result = await createPerson(fd)
      if (!result.ok) {
        setError(result.message)
        return
      }
      if (onSuccess) {
        onSuccess()
        return
      }
      if (form.isConnected) {
        form.reset()
      }
      router.push("/admin/personas")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="full_name" className={labelClass}>
          Nombre completo
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          autoComplete="name"
          className={inputClass}
          disabled={isPending}
          aria-required
        />
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Teléfono
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 tablet:grid-cols-2">
        <div>
          <label htmlFor="bank_id" className={labelClass}>
            Banco
          </label>
          <select
            id="bank_id"
            name="bank_id"
            className={selectClass}
            disabled={isPending}
            defaultValue=""
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
          <label htmlFor="bank_account_number" className={labelClass}>
            Cuenta de banco
          </label>
          <input
            id="bank_account_number"
            name="bank_account_number"
            type="text"
            autoComplete="off"
            placeholder="Número de cuenta de ahorros"
            className={inputClass}
            disabled={isPending}
            aria-describedby="bank_account_number_hint"
          />
          <p
            id="bank_account_number_hint"
            className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
          >
            Opcional. Si la completas, elige también el banco.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_member"
          name="is_member"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 rounded border-zinc-300 accent-emerald-600 dark:border-zinc-600"
          disabled={isPending}
          aria-label="Es miembro (puede ahorrar)"
        />
        <label htmlFor="is_member" className="text-sm text-zinc-700 dark:text-zinc-300">
          Es miembro (puede ahorrar en el sistema)
        </label>
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={buttonPrimaryClass}
          aria-busy={isPending}
        >
          {isPending ? "Guardando…" : "Guardar"}
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
