"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import {
  deleteSavingsTransaction,
  updateSavingsTransaction,
} from "@/lib/actions/savings"
import type { SavingsTransactionRow } from "@/lib/database.types"
import { labelSavingsTransactionType } from "@/lib/constants/labels-es"
import { formatMoney, toNumber } from "@/lib/format/money"
import { Modal } from "@/components/ui/modal"
import {
  buttonDangerClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from "@/lib/form-classes"

interface SavingsTransactionsTableProps {
  rows: SavingsTransactionRow[]
  isActive: boolean
}

const toDatetimeLocalValue = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SavingsTransactionsTable({
  rows,
  isActive,
}: SavingsTransactionsTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<SavingsTransactionRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<SavingsTransactionRow | null>(null)
  const [editFormKey, setEditFormKey] = useState(0)

  const handleOpenEdit = useCallback((row: SavingsTransactionRow) => {
    setEditFormKey((k) => k + 1)
    setEditRow(row)
    setErr(null)
    setMsg(null)
  }, [])

  const handleOpenDelete = useCallback((row: SavingsTransactionRow) => {
    setDeleteRow(row)
    setErr(null)
    setMsg(null)
  }, [])

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editRow) return
    setErr(null)
    setMsg(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set("transaction_id", editRow.id)
    startTransition(async () => {
      const r = await updateSavingsTransaction(fd)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Movimiento actualizado")
      setEditRow(null)
      router.refresh()
    })
  }

  const handleConfirmDelete = () => {
    if (!deleteRow) return
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await deleteSavingsTransaction(deleteRow.id)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Movimiento eliminado")
      setDeleteRow(null)
      router.refresh()
    })
  }

  const canEditRow = (row: SavingsTransactionRow) =>
    isActive && (row.type === "deposit" || row.type === "withdrawal")

  const canDeleteRow = (row: SavingsTransactionRow) => isActive

  return (
    <div className="space-y-3">
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

      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Fecha</th>
              <th className={thClass}>Tipo</th>
              <th className={thClass}>Monto</th>
              <th className={thClass}>Nota</th>
              <th className={`${thClass} text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className={`${tdClass} tabular-nums text-zinc-600`}>
                  {new Date(t.occurred_at).toLocaleString("es-MX")}
                </td>
                <td className={tdClass}>{labelSavingsTransactionType(t.type)}</td>
                <td className={`${tdClass} tabular-nums`}>
                  {formatMoney(toNumber(t.amount))}
                </td>
                <td className={tdClass}>{t.description ?? "—"}</td>
                <td className={`${tdClass} text-right`}>
                  <div className="flex flex-wrap justify-end gap-2">
                    {canEditRow(t) ? (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        disabled={isPending}
                        className="text-sm font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                        aria-label={`Editar movimiento del ${new Date(t.occurred_at).toLocaleString("es-MX")}`}
                      >
                        Editar
                      </button>
                    ) : null}
                    {canDeleteRow(t) ? (
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(t)}
                        disabled={isPending}
                        className="text-sm font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                        aria-label={`Eliminar movimiento del ${new Date(t.occurred_at).toLocaleString("es-MX")}`}
                      >
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={editRow !== null}
        onClose={() => setEditRow(null)}
        title="Editar movimiento"
        titleId="modal-editar-movimiento-ahorro-title"
      >
        {editRow && canEditRow(editRow) ? (
          <form key={editFormKey} onSubmit={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="transaction_id" value={editRow.id} />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Tipo: {labelSavingsTransactionType(editRow.type)}. Indica el monto en positivo
              (retiro o depósito).
            </p>
            <div>
              <label htmlFor="st_edit_amount" className={labelClass}>
                Monto
              </label>
              <input
                id="st_edit_amount"
                name="amount"
                type="text"
                inputMode="decimal"
                required
                className={inputClass}
                disabled={isPending}
                defaultValue={Math.abs(toNumber(editRow.amount)).toFixed(2)}
              />
            </div>
            <div>
              <label htmlFor="st_edit_occurred" className={labelClass}>
                Fecha y hora
              </label>
              <input
                id="st_edit_occurred"
                name="occurred_at"
                type="datetime-local"
                required
                className={inputClass}
                disabled={isPending}
                defaultValue={toDatetimeLocalValue(editRow.occurred_at)}
              />
            </div>
            <div>
              <label htmlFor="st_edit_desc" className={labelClass}>
                Concepto (opcional)
              </label>
              <input
                id="st_edit_desc"
                name="description"
                type="text"
                className={inputClass}
                disabled={isPending}
                defaultValue={editRow.description ?? ""}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setEditRow(null)}
                disabled={isPending}
                className={buttonSecondaryClass}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={deleteRow !== null}
        onClose={() => setDeleteRow(null)}
        title="Eliminar movimiento"
        titleId="modal-eliminar-movimiento-ahorro-title"
      >
        {deleteRow ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ¿Eliminar este movimiento ({labelSavingsTransactionType(deleteRow.type)},{" "}
              {formatMoney(toNumber(deleteRow.amount))})? Se revertirá el efecto en la cuenta y
              en el fondo.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className={buttonDangerClass}
                aria-label="Confirmar eliminación del movimiento"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setDeleteRow(null)}
                disabled={isPending}
                className={buttonSecondaryClass}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
