"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { createSavingsAccount } from "@/lib/actions/savings"
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
  selectClass,
} from "@/lib/form-classes"

interface Option {
  id: string
  full_name?: string
  name?: string
}

interface Props {
  persons: Option[]
  pools: Option[]
}

export function NewAccountForm({ persons, pools }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const r = await createSavingsAccount(fd)
      if (r.ok) {
        router.push(`/admin/cuentas-ahorro/${r.data.id}`)
        router.refresh()
        return
      }
      setError(r.message)
    })
  }

  if (!persons.length || !pools.length) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Necesitas al menos una persona activa y un fondo.{" "}
        <Link href="/admin/personas/nuevo" className="underline">
          Crear persona
        </Link>
        {" · "}
        <Link href="/admin/fondos/nuevo" className="underline">
          Crear fondo
        </Link>
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-5">
      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="person_id" className={labelClass}>
          Persona
        </label>
        <select
          id="person_id"
          name="person_id"
          required
          className={selectClass}
          disabled={isPending}
        >
          <option value="">Selecciona…</option>
          {persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="liquidity_pool_id" className={labelClass}>
          Fondo vinculado
        </label>
        <select
          id="liquidity_pool_id"
          name="liquidity_pool_id"
          required
          className={selectClass}
          disabled={isPending}
        >
          <option value="">Selecciona…</option>
          {pools.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="currency" className={labelClass}>
          Moneda
        </label>
        <input
          id="currency"
          name="currency"
          defaultValue="MXN"
          maxLength={3}
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
          Crear cuenta
        </button>
        <Link href="/admin/cuentas-ahorro" className={buttonSecondaryClass}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
