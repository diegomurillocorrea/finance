"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import {
  closeSavingsAccount,
  registerSavingsDeposit,
  registerSavingsWithdrawal,
} from "@/lib/actions/savings"
import { Modal } from "@/components/ui/modal"
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
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [depositKey, setDepositKey] = useState(0)
  const [withdrawKey, setWithdrawKey] = useState(0)

  const handleOpenDeposit = useCallback(() => {
    setDepositKey((k) => k + 1)
    setDepositOpen(true)
    setErr(null)
    setMsg(null)
  }, [])

  const handleOpenWithdraw = useCallback(() => {
    setWithdrawKey((k) => k + 1)
    setWithdrawOpen(true)
    setErr(null)
    setMsg(null)
  }, [])

  const handleDepositSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set("account_id", accountId)
    startTransition(async () => {
      const r = await registerSavingsDeposit(fd)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Depósito registrado")
      setDepositOpen(false)
      if (form.isConnected) {
        form.reset()
      }
      router.refresh()
    })
  }

  const handleWithdrawSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set("account_id", accountId)
    startTransition(async () => {
      const r = await registerSavingsWithdrawal(fd)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Retiro registrado")
      setWithdrawOpen(false)
      if (form.isConnected) {
        form.reset()
      }
      router.refresh()
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
    <div className="space-y-6">
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

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={handleOpenDeposit}
          className={`${buttonPrimaryClass} gap-2`}
          aria-haspopup="dialog"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Registrar depósito
        </button>
        <button
          type="button"
          onClick={handleOpenWithdraw}
          className={`${buttonSecondaryClass} gap-2`}
          aria-haspopup="dialog"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path d="M5 12h14" strokeLinecap="round" />
          </svg>
          Registrar retiro
        </button>
      </div>

      <Modal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        title="Registrar depósito"
        titleId="modal-deposito-cuenta-title"
      >
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Suma saldo de la cuenta y liquidez del fondo vinculado.
        </p>
        <form key={depositKey} onSubmit={handleDepositSubmit} className="space-y-4">
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
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
              Registrar depósito
            </button>
            <button
              type="button"
              onClick={() => setDepositOpen(false)}
              disabled={isPending}
              className={buttonSecondaryClass}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="Registrar retiro"
        titleId="modal-retiro-cuenta-title"
      >
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Saldo actual:{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{balance.toFixed(2)}</span>
        </p>
        <form key={withdrawKey} onSubmit={handleWithdrawSubmit} className="space-y-4">
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
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
              Registrar retiro
            </button>
            <button
              type="button"
              onClick={() => setWithdrawOpen(false)}
              disabled={isPending}
              className={buttonSecondaryClass}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}

export function CloseAccountAction({ accountId, isActive, balance }: AccountActionsProps) {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [closeOpen, setCloseOpen] = useState(false)

  const handleOpenClose = () => {
    setErr(null)
    setCloseOpen(true)
  }

  const handleClose = () => {
    setErr(null)
    startTransition(async () => {
      const result = await closeSavingsAccount(accountId)
      if (!result.ok) {
        setErr(result.message)
        return
      }
      setCloseOpen(false)
      router.refresh()
    })
  }

  if (!isActive) return null

  return (
    <section className="rounded-2xl border border-red-200/70 bg-red-50/50 p-6 dark:border-red-950 dark:bg-red-950/20 tablet:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Cerrar cuenta</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Esta acción solo está disponible cuando el saldo sea USD 0.00.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenClose}
          disabled={isPending || balance !== 0}
          className={`${buttonDangerClass} shrink-0`}
        >
          Cerrar cuenta
        </button>
      </div>
      {err ? (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {err}
        </div>
      ) : null}

      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Cerrar cuenta"
        titleId="modal-cerrar-cuenta-title"
      >
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          ¿Confirmas cerrar esta cuenta? Solo es posible con saldo 0.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending || balance !== 0}
            className={buttonDangerClass}
          >
            Sí, cerrar cuenta
          </button>
          <button
            type="button"
            onClick={() => setCloseOpen(false)}
            disabled={isPending}
            className={buttonSecondaryClass}
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </section>
  )
}
