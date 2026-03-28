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

export interface NewLoanFormProps {
  persons: Option[]
  pools: Option[]
  onSuccess?: (loanId: string) => void
  onCancel?: () => void
}

export function NewLoanForm({
  persons,
  pools,
  onSuccess,
  onCancel,
}: NewLoanFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    startTransition(async () => {
      const r = await createLoan(fd)
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
      router.push(`/admin/prestamos/${r.data.id}`)
      router.refresh()
    })
  }

  if (!persons.length || !pools.length) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Necesitas personas y fondos.{" "}
        <Link href="/admin/personas?nueva=1" className="underline">
          Persona
        </Link>
        {" · "}
        <Link href="/admin/fondos?nueva=1" className="underline">
          Fondo
        </Link>
      </p>
    )
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
        <label htmlFor="nl_borrower_id" className={labelClass}>
          Prestatario
        </label>
        <select
          id="nl_borrower_id"
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
        <label htmlFor="nl_liquidity_pool_id" className={labelClass}>
          Fondo (desembolso saldrá de aquí)
        </label>
        <select
          id="nl_liquidity_pool_id"
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
          <label htmlFor="nl_principal" className={labelClass}>
            Monto principal
          </label>
          <input
            id="nl_principal"
            name="principal"
            type="text"
            inputMode="decimal"
            required
            className={inputClass}
            disabled={isPending}
          />
        </div>
        <div>
          <label htmlFor="nl_monthly_interest_rate" className={labelClass}>
            Tasa mensual (%)
          </label>
          <input
            id="nl_monthly_interest_rate"
            name="monthly_interest_rate"
            type="text"
            inputMode="decimal"
            required
            className={inputClass}
            placeholder="2"
            disabled={isPending}
          />
        </div>
      </div>

      <div>
        <label htmlFor="nl_term_months" className={labelClass}>
          Plazo referencial (meses)
        </label>
        <input
          id="nl_term_months"
          name="term_months"
          type="number"
          min={1}
          max={600}
          required
          className={inputClass}
          disabled={isPending}
          aria-describedby="nl_term_months_hint"
        />
        <p id="nl_term_months_hint" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          No fija cuotas: el préstamo se liquida con abonos a capital; el interés es sobre el
          saldo pendiente.
        </p>
      </div>

      <div>
        <label htmlFor="nl_payment_frequency" className={labelClass}>
          Frecuencia de pago
        </label>
        <select
          id="nl_payment_frequency"
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
        <label htmlFor="nl_purpose" className={labelClass}>
          Finalidad (opcional)
        </label>
        <input id="nl_purpose" name="purpose" className={inputClass} disabled={isPending} />
      </div>

      <div>
        <label htmlFor="nl_status" className={labelClass}>
          Estado inicial
        </label>
        <select
          id="nl_status"
          name="status"
          defaultValue="draft"
          className={selectClass}
          disabled={isPending}
        >
          <option value="draft">Borrador</option>
          <option value="pending_approval">Pendiente de aprobación</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
          Guardar préstamo
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
