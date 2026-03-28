"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { createLoan } from "@/lib/actions/loans"
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

export function NewLoanForm({ persons, pools }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const r = await createLoan(fd)
      if (r.ok) {
        router.push(`/admin/prestamos/${r.data.id}`)
        router.refresh()
        return
      }
      setError(r.message)
    })
  }

  if (!persons.length || !pools.length) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Necesitas personas y fondos.{" "}
        <Link href="/admin/personas/nuevo" className="underline">
          Persona
        </Link>
        {" · "}
        <Link href="/admin/fondos/nuevo" className="underline">
          Fondo
        </Link>
      </p>
    )
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
        <label htmlFor="borrower_id" className={labelClass}>
          Prestatario
        </label>
        <select
          id="borrower_id"
          name="borrower_id"
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
          Fondo (desembolso saldrá de aquí)
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

      <div className="grid gap-4 tablet:grid-cols-2">
        <div>
          <label htmlFor="principal" className={labelClass}>
            Monto principal
          </label>
          <input
            id="principal"
            name="principal"
            type="text"
            inputMode="decimal"
            required
            className={inputClass}
            disabled={isPending}
          />
        </div>
        <div>
          <label htmlFor="annual_interest_rate" className={labelClass}>
            Tasa anual (%)
          </label>
          <input
            id="annual_interest_rate"
            name="annual_interest_rate"
            type="text"
            inputMode="decimal"
            required
            className={inputClass}
            placeholder="24"
            disabled={isPending}
          />
        </div>
      </div>

      <div>
        <label htmlFor="term_months" className={labelClass}>
          Plazo (meses)
        </label>
        <input
          id="term_months"
          name="term_months"
          type="number"
          min={1}
          max={600}
          required
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="payment_frequency" className={labelClass}>
          Frecuencia de pago
        </label>
        <select
          id="payment_frequency"
          name="payment_frequency"
          defaultValue="monthly"
          className={selectClass}
          disabled={isPending}
        >
          <option value="monthly">Mensual</option>
          <option value="biweekly">Quincenal</option>
        </select>
      </div>

      <div>
        <label htmlFor="purpose" className={labelClass}>
          Finalidad (opcional)
        </label>
        <input id="purpose" name="purpose" className={inputClass} disabled={isPending} />
      </div>

      <div>
        <label htmlFor="status" className={labelClass}>
          Estado inicial
        </label>
        <select id="status" name="status" defaultValue="draft" className={selectClass} disabled={isPending}>
          <option value="draft">Borrador</option>
          <option value="pending_approval">Pendiente de aprobación</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
          Guardar préstamo
        </button>
        <Link href="/admin/prestamos" className={buttonSecondaryClass}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
