"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { createLiquidityPool } from "@/lib/actions/pools"
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/lib/form-classes"

export interface PoolCreateFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function PoolCreateForm({ onSuccess, onCancel }: PoolCreateFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    startTransition(async () => {
      const r = await createLiquidityPool(fd)
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
      router.push("/admin/fondos")
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
        <label htmlFor="pool_name" className={labelClass}>
          Nombre del fondo
        </label>
        <input
          id="pool_name"
          name="name"
          required
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="pool_is_default"
          name="is_default"
          type="checkbox"
          className="h-4 w-4 rounded border-zinc-300 accent-emerald-600 dark:border-zinc-600"
          disabled={isPending}
        />
        <label htmlFor="pool_is_default" className="text-sm text-zinc-700 dark:text-zinc-300">
          Marcar como fondo predeterminado
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
          {isPending ? "Guardando…" : "Crear"}
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
