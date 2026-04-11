"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { createSavingsAccount } from "@/lib/actions/savings"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  labelClass,
  selectClass,
} from "@/lib/form-classes"

interface Option {
  id: string
  full_name?: string
  name?: string
  phone?: string | null
}

export interface NewAccountFormProps {
  persons: Option[]
  pools: Option[]
  onSuccess?: (accountId: string) => void
  onCancel?: () => void
}

export function NewAccountForm({
  persons,
  pools,
  onSuccess,
  onCancel,
}: NewAccountFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    startTransition(async () => {
      const r = await createSavingsAccount(fd)
      if (!r.ok) {
        setError(r.message)
        return
      }
      if (onSuccess) {
        onSuccess(r.data.id)
        return
      }
      if (form.isConnected) {
        form.reset()
      }
      router.push(`/admin/cuentas-ahorro/${r.data.id}`)
      router.refresh()
    })
  }

  if (!persons.length || !pools.length) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Necesitas al menos un miembro activo y un fondo.{" "}
        <Link href="/admin/personas?nueva=1" className="underline">
          Crear persona
        </Link>
        {" · "}
        <Link href="/admin/fondos?nueva=1" className="underline">
          Crear fondo
        </Link>
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-5"
    >
      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <SearchableSelect
        id="acc_person_id"
        name="person_id"
        label="Persona"
        required
        disabled={isPending}
        placeholder="Buscar por nombre…"
        emptyMessage="Ninguna persona coincide. Prueba otro texto."
        options={persons.map((p) => ({
          id: p.id,
          label: p.full_name ?? p.id,
          description: p.phone?.trim() ? `Tel. ${p.phone}` : undefined,
        }))}
      />

      <div>
        <label htmlFor="acc_liquidity_pool_id" className={labelClass}>
          Fondo vinculado
        </label>
        <select
          id="acc_liquidity_pool_id"
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

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Todos los montos se registran en dólares estadounidenses (USD).
      </p>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
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
        <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
          Crear cuenta
        </button>
      </div>
    </form>
  )
}
