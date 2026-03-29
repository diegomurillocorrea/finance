"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { createBank } from "@/lib/actions/banks"
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/lib/form-classes"

export interface BankCreateFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function BankCreateForm({ onSuccess, onCancel }: BankCreateFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    startTransition(async () => {
      const r = await createBank(fd)
      if (!r.ok) {
        setError(r.message)
        return
      }
      if (onSuccess) {
        onSuccess()
        return
      }
      if (form.isConnected) {
        form.reset()
      }
      router.push("/admin/bancos")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="bank_name" className={labelClass}>
          Nombre del banco
        </label>
        <input
          id="bank_name"
          name="name"
          required
          autoComplete="organization"
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
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
