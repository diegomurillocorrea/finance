"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  closeSavingsAccount,
  registerSavingsDeposit,
  registerSavingsWithdrawal,
} from "@/lib/actions/savings"
import {
  buttonDangerClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/lib/form-classes"

interface AccountActionsProps {
  accountId: string
  isActive: boolean
  balance: number
}

export function AccountActions({ accountId, isActive, balance }: AccountActionsProps) {
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDeposit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    fd.set("account_id", accountId)
    startTransition(async () => {
      const r = await registerSavingsDeposit(fd)
      if (r.ok) {
        setMsg("Depósito registrado")
        e.currentTarget.reset()
        router.refresh()
        return
      }
      setErr(r.message)
    })
  }

  const handleWithdraw = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    fd.set("account_id", accountId)
    startTransition(async () => {
      const r = await registerSavingsWithdrawal(fd)
      if (r.ok) {
        setMsg("Retiro registrado")
        e.currentTarget.reset()
        router.refresh()
        return
      }
      setErr(r.message)
    })
  }

  const handleClose = () => {
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await closeSavingsAccount(accountId)
      if (r.ok) {
        router.refresh()
        setMsg("Cuenta cerrada")
        return
      }
      setErr(r.message)
    })
  }

  if (!isActive) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Esta cuenta está cerrada o suspendida. No se permiten movimientos.
      </p>
    )
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

      <div className="grid gap-8 tablet:grid-cols-2">
        <form onSubmit={handleDeposit} className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Depósito</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Suma saldo de la cuenta y liquidez del fondo vinculado.
          </p>
          <div>
            <label htmlFor="dep_amount" className={labelClass}>
              Monto
            </label>
            <input
              id="dep_amount"
              name="amount"
              type="text"
              inputMode="decimal"
              required
              className={inputClass}
              disabled={isPending}
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="dep_desc" className={labelClass}>
              Concepto (opcional)
            </label>
            <input id="dep_desc" name="description" className={inputClass} disabled={isPending} />
          </div>
          <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
            Registrar depósito
          </button>
        </form>

        <form onSubmit={handleWithdraw} className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Retiro</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Saldo actual:{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{balance.toFixed(2)}</span>
          </p>
          <div>
            <label htmlFor="wd_amount" className={labelClass}>
              Monto
            </label>
            <input
              id="wd_amount"
              name="amount"
              type="text"
              inputMode="decimal"
              required
              className={inputClass}
              disabled={isPending}
            />
          </div>
          <div>
            <label htmlFor="wd_desc" className={labelClass}>
              Concepto (opcional)
            </label>
            <input id="wd_desc" name="description" className={inputClass} disabled={isPending} />
          </div>
          <button type="submit" disabled={isPending} className={buttonSecondaryClass}>
            Registrar retiro
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Cerrar cuenta</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Solo permitido con saldo 0. La cuenta pasará a estado cerrado.
        </p>
        <button
          type="button"
          onClick={handleClose}
          disabled={isPending || balance !== 0}
          className={`${buttonDangerClass} mt-4`}
        >
          Cerrar cuenta
        </button>
      </div>
    </div>
  )
}
