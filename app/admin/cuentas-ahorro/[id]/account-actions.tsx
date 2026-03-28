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
  const [closeOpen, setCloseOpen] = useState(false)
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

  const handleClose = () => {
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await closeSavingsAccount(accountId)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setCloseOpen(false)
      setMsg("Cuenta cerrada")
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

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleOpenDeposit}
          className={buttonPrimaryClass}
          aria-haspopup="dialog"
        >
          Registrar depósito
        </button>
        <button
          type="button"
          onClick={handleOpenWithdraw}
          className={buttonSecondaryClass}
          aria-haspopup="dialog"
        >
          Registrar retiro
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Cerrar cuenta</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Solo permitido con saldo 0. La cuenta pasará a estado cerrado.
        </p>
        <button
          type="button"
          onClick={() => {
            setErr(null)
            setMsg(null)
            setCloseOpen(true)
          }}
          disabled={isPending || balance !== 0}
          className={`${buttonDangerClass} mt-4`}
        >
          Cerrar cuenta
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
    </div>
  )
}
