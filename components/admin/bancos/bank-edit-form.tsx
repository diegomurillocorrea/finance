"use client"

import type { BankRow } from "@/lib/database.types"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { updateBank } from "@/lib/actions/banks"
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/lib/form-classes"

export interface BankEditFormProps {
  bank: BankRow
  onSuccess?: () => void
  onCancel?: () => void
}

export function BankEditForm({ bank, onSuccess, onCancel }: BankEditFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set("id", bank.id)
    startTransition(async () => {
      const r = await updateBank(fd)
      if (!r.ok) {
        setError(r.message)
        return
      }
      if (onSuccess) {
        onSuccess()
        return
      }
      router.push("/admin/bancos")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={bank.id} />
      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div>
        <p className={labelClass}>ID</p>
        <p className="mt-1 font-mono text-sm text-zinc-600 dark:text-zinc-400">{bank.id}</p>
      </div>

      <div>
        <p className={labelClass}>Creado</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {new Intl.DateTimeFormat("es", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(bank.created_at))}
        </p>
      </div>

      <div>
        <label htmlFor="edit_bank_name" className={labelClass}>
          Nombre del banco
        </label>
        <input
          id="edit_bank_name"
          name="name"
          required
          defaultValue={bank.name}
          autoComplete="organization"
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
          Guardar cambios
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
