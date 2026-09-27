"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import { deleteLoanDisbursement, updateLoanDisbursement } from "@/lib/actions/loans"
import type { PoolMovementRow } from "@/lib/database.types"
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

type DisbursementRow = Pick<PoolMovementRow, "id" | "amount" | "occurred_at" | "description">

interface LoanDisbursementsTableProps {
  rows: DisbursementRow[]
  canEdit: boolean
  currencyCode?: string
}

const toDatetimeLocalValue = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatDateTime = (iso: string): string => new Date(iso).toLocaleString("es-MX")

export function LoanDisbursementsTable({
  rows,
  canEdit,
  currencyCode,
}: LoanDisbursementsTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<DisbursementRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<DisbursementRow | null>(null)
  const [editFormKey, setEditFormKey] = useState(0)

  const canDelete = canEdit && rows.length > 1

  const handleOpenEdit = useCallback((row: DisbursementRow) => {
    setEditFormKey((k) => k + 1)
    setEditRow(row)
    setErr(null)
    setMsg(null)
  }, [])

  const handleOpenDelete = useCallback((row: DisbursementRow) => {
    setDeleteRow(row)
    setErr(null)
    setMsg(null)
  }, [])

  const handleCloseEdit = () => setEditRow(null)
  const handleCloseDelete = () => setDeleteRow(null)

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editRow) return
    setErr(null)
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    fd.set("movement_id", editRow.id)
    startTransition(async () => {
      const r = await updateLoanDisbursement(fd)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Desembolso actualizado")
      setEditRow(null)
      router.refresh()
    })
  }

  const handleConfirmDelete = () => {
    if (!deleteRow) return
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await deleteLoanDisbursement(deleteRow.id)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Desembolso eliminado")
      setDeleteRow(null)
      router.refresh()
    })
  }

  const isModalOpen = editRow !== null || deleteRow !== null
  const errorAlert = err ? (
    <div
      role="alert"
      className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
    >
      {err}
    </div>
  ) : null

  return (
    <div className="space-y-3">
      {isModalOpen ? null : errorAlert}
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
              <th className={thClass}>Descripción</th>
              <th className={`${thClass} text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((d) => (
              <tr key={d.id}>
                <td className={`${tdClass} tabular-nums`}>{formatDateTime(d.occurred_at)}</td>
                <td className={`${tdClass} tabular-nums font-medium`}>
                  {formatMoney(Math.abs(toNumber(d.amount)), currencyCode)}
                </td>
                <td className={tdClass}>{d.description ?? "—"}</td>
                <td className={`${tdClass} text-right`}>
                  {canEdit ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(d)}
                        disabled={isPending}
                        className="text-sm font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                        aria-label={`Editar desembolso del ${formatDateTime(d.occurred_at)}`}
                      >
                        Editar
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(d)}
                          disabled={isPending}
                          className="text-sm font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                          aria-label={`Eliminar desembolso del ${formatDateTime(d.occurred_at)}`}
                        >
                          Eliminar
                        </button>
                      ) : null}
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
        open={editRow !== null && canEdit}
        onClose={handleCloseEdit}
        title="Editar desembolso"
        titleId="modal-editar-desembolso-title"
        panelClassName="max-w-xl"
      >
        {editRow && canEdit ? (
          <form key={editFormKey} onSubmit={handleEditSubmit} className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              El capital prestado y el saldo del fondo se ajustarán con la diferencia.
            </p>
            {errorAlert}
            <div>
              <label htmlFor="ld_edit_amount" className={labelClass}>
                Monto
              </label>
              <input
                id="ld_edit_amount"
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
              <label htmlFor="ld_edit_occurred_at" className={labelClass}>
                Fecha y hora
              </label>
              <input
                id="ld_edit_occurred_at"
                name="occurred_at"
                type="datetime-local"
                required
                className={inputClass}
                disabled={isPending}
                defaultValue={toDatetimeLocalValue(editRow.occurred_at)}
              />
            </div>
            <div>
              <label htmlFor="ld_edit_description" className={labelClass}>
                Descripción
              </label>
              <input
                id="ld_edit_description"
                name="description"
                type="text"
                className={inputClass}
                disabled={isPending}
                defaultValue={editRow.description ?? ""}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
                {isPending ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={handleCloseEdit}
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
        open={deleteRow !== null && canDelete}
        onClose={handleCloseDelete}
        title="Eliminar desembolso"
        titleId="modal-eliminar-desembolso-title"
      >
        {deleteRow && canDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {`¿Eliminar este desembolso (${formatMoney(Math.abs(toNumber(deleteRow.amount)), currencyCode)})?`}{" "}
              El monto regresará al fondo y se restará del capital prestado.
            </p>
            {errorAlert}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className={buttonDangerClass}
                aria-label="Confirmar eliminación del desembolso"
              >
                {isPending ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button
                type="button"
                onClick={handleCloseDelete}
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
