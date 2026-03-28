"use client"

import type { LiquidityPoolRow } from "@/lib/database.types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { updateLiquidityPool } from "@/lib/actions/pools"
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/lib/form-classes"

interface Props {
  pool: LiquidityPoolRow
}

export function PoolEditForm({ pool }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set("id", pool.id)
    startTransition(async () => {
      const r = await updateLiquidityPool(fd)
      if (r.ok) {
        router.push("/admin/fondos")
        router.refresh()
        return
      }
      setError(r.message)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-5">
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
        <label htmlFor="name" className={labelClass}>
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={pool.name}
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="currency" className={labelClass}>
          Moneda
        </label>
        <input
          id="currency"
          name="currency"
          defaultValue={pool.currency}
          maxLength={3}
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_default"
          name="is_default"
          type="checkbox"
          defaultChecked={pool.is_default}
          className="h-4 w-4 rounded border-zinc-300 accent-emerald-600 dark:border-zinc-600"
          disabled={isPending}
        />
        <label htmlFor="is_default" className="text-sm text-zinc-700 dark:text-zinc-300">
          Fondo predeterminado
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
          Guardar
        </button>
        <Link href="/admin/fondos" className={buttonSecondaryClass}>
          Volver
        </Link>
      </div>
    </form>
  )
}
