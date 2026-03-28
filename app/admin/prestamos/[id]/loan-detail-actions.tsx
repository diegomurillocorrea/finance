"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  cancelLoanDraft,
  disburseLoan,
  payNextLoanInstallment,
  recordCustomLoanPayment,
  updateLoanDraft,
} from "@/lib/actions/loans"
import type { LoanRow } from "@/lib/database.types"
import {
  buttonDangerClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/lib/form-classes"

interface Props {
  loan: LoanRow & {
    persons: { full_name: string } | null
    liquidity_pools: { name: string; currency: string } | null
  }
}

export function LoanDetailActions({ loan }: Props) {
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDraft =
    loan.status === "draft" || loan.status === "pending_approval"
  const isActive = loan.status === "active"

  const handleDisburse = () => {
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await disburseLoan(loan.id)
      if (r.ok) {
        setMsg("Desembolso realizado y cuotas generadas")
        router.refresh()
        return
      }
      setErr(r.message)
    })
  }

  const handlePayNext = () => {
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await payNextLoanInstallment(loan.id)
      if (r.ok) {
        setMsg("Pago de cuota registrado")
        router.refresh()
        return
      }
      setErr(r.message)
    })
  }

  const handleCancel = () => {
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await cancelLoanDraft(loan.id)
      if (r.ok) {
        setMsg("Préstamo cancelado")
        router.refresh()
        return
      }
      setErr(r.message)
    })
  }

  const handleUpdateDraft = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    fd.set("id", loan.id)
    startTransition(async () => {
      const r = await updateLoanDraft(fd)
      if (r.ok) {
        setMsg("Borrador actualizado")
        router.refresh()
        return
      }
      setErr(r.message)
    })
  }

  const handleCustomPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    fd.set("loan_id", loan.id)
    startTransition(async () => {
      const r = await recordCustomLoanPayment(fd)
      if (r.ok) {
        setMsg("Pago registrado")
        e.currentTarget.reset()
        router.refresh()
        return
      }
      setErr(r.message)
    })
  }

  return (
    <div className="space-y-8">
      {err ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {err}
        </div>
      ) : null}
      {msg ? (
        <div
          role="status"
          className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
        >
          {msg}
        </div>
      ) : null}

      {isDraft ? (
        <div className="space-y-6">
          <form onSubmit={handleUpdateDraft} className="grid max-w-xl gap-4 tablet:grid-cols-2">
            <input type="hidden" name="id" value={loan.id} />
            <div className="tablet:col-span-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Editar borrador</h3>
            </div>
            <div>
              <label htmlFor="principal" className={labelClass}>
                Principal
              </label>
              <input
                id="principal"
                name="principal"
                type="text"
                inputMode="decimal"
                required
                defaultValue={loan.principal}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div>
              <label htmlFor="annual_interest_rate" className={labelClass}>
                Tasa anual %
              </label>
              <input
                id="annual_interest_rate"
                name="annual_interest_rate"
                type="text"
                required
                defaultValue={loan.annual_interest_rate}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div>
              <label htmlFor="term_months" className={labelClass}>
                Meses
              </label>
              <input
                id="term_months"
                name="term_months"
                type="number"
                min={1}
                required
                defaultValue={loan.term_months}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div>
              <label htmlFor="payment_frequency" className={labelClass}>
                Frecuencia
              </label>
              <input
                id="payment_frequency"
                name="payment_frequency"
                defaultValue={loan.payment_frequency}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="tablet:col-span-2">
              <label htmlFor="purpose" className={labelClass}>
                Finalidad
              </label>
              <input
                id="purpose"
                name="purpose"
                defaultValue={loan.purpose ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="tablet:col-span-2">
              <button type="submit" disabled={isPending} className={buttonSecondaryClass}>
                Guardar borrador
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDisburse}
              disabled={isPending}
              className={buttonPrimaryClass}
            >
              Desembolsar (activar y generar cuotas)
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className={buttonDangerClass}
            >
              Cancelar préstamo
            </button>
          </div>
        </div>
      ) : null}

      {isActive ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePayNext}
              disabled={isPending}
              className={buttonPrimaryClass}
            >
              Pagar siguiente cuota
            </button>
          </div>

          <form onSubmit={handleCustomPayment} className="max-w-xl space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Pago manual</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Capital + interés + mora deben sumar el monto total.
            </p>
            <div className="grid gap-4 tablet:grid-cols-2">
              <div>
                <label htmlFor="cp_amount" className={labelClass}>
                  Monto total
                </label>
                <input
                  id="cp_amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  required
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label htmlFor="cp_principal" className={labelClass}>
                  Capital
                </label>
                <input
                  id="cp_principal"
                  name="principal_portion"
                  type="text"
                  inputMode="decimal"
                  required
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label htmlFor="cp_interest" className={labelClass}>
                  Interés
                </label>
                <input
                  id="cp_interest"
                  name="interest_portion"
                  type="text"
                  inputMode="decimal"
                  required
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label htmlFor="cp_penalty" className={labelClass}>
                  Mora / otros
                </label>
                <input
                  id="cp_penalty"
                  name="penalty_portion"
                  type="text"
                  inputMode="decimal"
                  defaultValue="0"
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
            </div>
            <div>
              <label htmlFor="cp_notes" className={labelClass}>
                Notas
              </label>
              <input id="cp_notes" name="notes" className={inputClass} disabled={isPending} />
            </div>
            <button type="submit" disabled={isPending} className={buttonSecondaryClass}>
              Registrar pago
            </button>
          </form>
        </div>
      ) : null}

      {!isDraft && !isActive ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Este préstamo está en estado «{loan.status}». No hay acciones disponibles.
        </p>
      ) : null}
    </div>
  )
}
