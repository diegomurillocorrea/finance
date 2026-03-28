"use client"

import type { LiquidityPoolRow } from "@/lib/database.types"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { updateLiquidityPool } from "@/lib/actions/pools"
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/lib/form-classes"

export interface PoolEditFormProps {
  pool: LiquidityPoolRow
  onSuccess?: () => void
  onCancel?: () => void
}

export function PoolEditForm({ pool, onSuccess, onCancel }: PoolEditFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set("id", pool.id)
    startTransition(async () => {
      const r = await updateLiquidityPool(fd)
      if (!r.ok) {
        setError(r.message)
        return
      }
      if (onSuccess) {
        onSuccess()
        return
      }
      router.push("/admin/fondos")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={pool.id} />
      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="edit_pool_name" className={labelClass}>
          Nombre
        </label>
        <input
          id="edit_pool_name"
          name="name"
          required
          defaultValue={pool.name}
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="edit_pool_is_default"
          name="is_default"
          type="checkbox"
          defaultChecked={pool.is_default}
          className="h-4 w-4 rounded border-zinc-300 accent-emerald-600 dark:border-zinc-600"
          disabled={isPending}
        />
        <label htmlFor="edit_pool_is_default" className="text-sm text-zinc-700 dark:text-zinc-300">
          Fondo predeterminado
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
          Guardar
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
