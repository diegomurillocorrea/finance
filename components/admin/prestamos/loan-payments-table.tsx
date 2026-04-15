"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import { deleteLoanPayment, updateLoanPayment } from "@/lib/actions/loans"
import type { LoanPaymentRow } from "@/lib/database.types"
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

interface LoanPaymentsTableProps {
  rows: LoanPaymentRow[]
  canEditPayments: boolean
  currencyCode?: string
}

const toDatetimeLocalValue = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function LoanPaymentsTable({
  rows,
  canEditPayments,
  currencyCode,
}: LoanPaymentsTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<LoanPaymentRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<LoanPaymentRow | null>(null)
  const [editFormKey, setEditFormKey] = useState(0)

  const handleOpenEdit = useCallback((row: LoanPaymentRow) => {
    setEditFormKey((k) => k + 1)
    setEditRow(row)
    setErr(null)
    setMsg(null)
  }, [])

  const handleOpenDelete = useCallback((row: LoanPaymentRow) => {
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
    fd.set("payment_id", editRow.id)
    startTransition(async () => {
      const r = await updateLoanPayment(fd)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Pago actualizado")
      setEditRow(null)
      router.refresh()
    })
  }

  const handleConfirmDelete = () => {
    if (!deleteRow) return
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await deleteLoanPayment(deleteRow.id)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Pago eliminado")
      setDeleteRow(null)
      router.refresh()
    })
  }

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
              <th className={thClass}>Monto</th>
              <th className={thClass}>Capital</th>
              <th className={thClass}>Interés</th>
              <th className={thClass}>Nota</th>
              <th className={`${thClass} text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={`${tdClass} tabular-nums text-zinc-600`}>
                  {new Date(p.paid_at).toLocaleString("es-MX")}
                </td>
                <td className={`${tdClass} tabular-nums`}>
                  {formatMoney(toNumber(p.amount), currencyCode)}
                </td>
                <td className={`${tdClass} tabular-nums`}>
                  {formatMoney(toNumber(p.principal_portion), currencyCode)}
                </td>
                <td className={`${tdClass} tabular-nums`}>
                  {formatMoney(toNumber(p.interest_portion), currencyCode)}
                </td>
                <td className={tdClass}>{p.notes ?? "—"}</td>
                <td className={`${tdClass} text-right`}>
                  {canEditPayments ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        disabled={isPending}
                        className="text-sm font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                        aria-label={`Editar pago del ${new Date(p.paid_at).toLocaleString("es-MX")}`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(p)}
                        disabled={isPending}
                        className="text-sm font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                        aria-label={`Eliminar pago del ${new Date(p.paid_at).toLocaleString("es-MX")}`}
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={editRow !== null && canEditPayments}
        onClose={() => setEditRow(null)}
        title="Editar pago"
        titleId="modal-editar-pago-prestamo-title"
        panelClassName="max-w-xl"
      >
        {editRow && canEditPayments ? (
          <form key={editFormKey} onSubmit={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="payment_id" value={editRow.id} />
            <div>
              <label htmlFor="lp_edit_principal" className={labelClass}>
                Capital
              </label>
              <input
                id="lp_edit_principal"
                name="principal_amount"
                type="text"
                inputMode="decimal"
                required
                className={inputClass}
                disabled={isPending}
                defaultValue={toNumber(editRow.principal_portion).toFixed(2)}
              />
            </div>
            <div>
              <label htmlFor="lp_edit_interest" className={labelClass}>
                Interés
              </label>
              <input
                id="lp_edit_interest"
                name="interest_amount"
                type="text"
                inputMode="decimal"
                required
                className={inputClass}
                disabled={isPending}
                defaultValue={toNumber(editRow.interest_portion).toFixed(2)}
              />
            </div>
            <div>
              <label htmlFor="lp_edit_paid_at" className={labelClass}>
                Fecha y hora
              </label>
              <input
                id="lp_edit_paid_at"
                name="paid_at"
                type="datetime-local"
                required
                className={inputClass}
                disabled={isPending}
                defaultValue={toDatetimeLocalValue(editRow.paid_at)}
              />
            </div>
            <div>
              <label htmlFor="lp_edit_notes" className={labelClass}>
                Notas
              </label>
              <input
                id="lp_edit_notes"
                name="notes"
                type="text"
                className={inputClass}
                disabled={isPending}
                defaultValue={editRow.notes ?? ""}
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
        open={deleteRow !== null && canEditPayments}
        onClose={() => setDeleteRow(null)}
        title="Eliminar pago"
        titleId="modal-eliminar-pago-prestamo-title"
      >
        {deleteRow && canEditPayments ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ¿Eliminar este pago ({formatMoney(toNumber(deleteRow.amount), currencyCode)})? Se
              revertirá el efecto en el fondo y el saldo del préstamo.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className={buttonDangerClass}
                aria-label="Confirmar eliminación del pago"
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
