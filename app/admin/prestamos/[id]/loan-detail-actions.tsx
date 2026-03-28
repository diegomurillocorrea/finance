"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import {
  cancelLoanDraft,
  disburseLoan,
  registerLoanAbono,
  updateLoanDraft,
} from "@/lib/actions/loans"
import type { LoanRow } from "@/lib/database.types"
import { labelLoanStatus } from "@/lib/constants/labels-es"
import { formatMoney } from "@/lib/format/money"
import { Modal } from "@/components/ui/modal"
import {
  buttonDangerClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
  selectClass,
} from "@/lib/form-classes"

interface Props {
  loan: LoanRow & {
    persons: { full_name: string } | null
    liquidity_pools: { name: string; currency: string } | null
  }
  outstandingPrincipal: number
  suggestedMonthlyInterest: number
}

export function LoanDetailActions({
  loan,
  outstandingPrincipal,
  suggestedMonthlyInterest,
}: Props) {
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [editDraftOpen, setEditDraftOpen] = useState(false)
  const [abonoOpen, setAbonoOpen] = useState(false)
  const [draftFormKey, setDraftFormKey] = useState(0)
  const [abonoFormKey, setAbonoFormKey] = useState(0)
  const [abonoKind, setAbonoKind] = useState<"interest" | "principal">("interest")
  const [interestOnlyAmount, setInterestOnlyAmount] = useState("")
  const [principalAmountInput, setPrincipalAmountInput] = useState("")
  const [capitalPairInterestInput, setCapitalPairInterestInput] = useState("")

  const isDraft =
    loan.status === "draft" || loan.status === "pending_approval"
  const isActive = loan.status === "active"
  const canRegisterAbono = isActive && outstandingPrincipal > 0.01

  const suggestedInterestStr =
    suggestedMonthlyInterest > 0 ? suggestedMonthlyInterest.toFixed(2) : ""

  const handleOpenEditDraft = useCallback(() => {
    setDraftFormKey((k) => k + 1)
    setEditDraftOpen(true)
    setErr(null)
    setMsg(null)
  }, [])

  const handleOpenAbono = useCallback(() => {
    setAbonoFormKey((k) => k + 1)
    setAbonoKind("interest")
    setInterestOnlyAmount(suggestedInterestStr)
    setPrincipalAmountInput("")
    setCapitalPairInterestInput(suggestedInterestStr)
    setAbonoOpen(true)
    setErr(null)
    setMsg(null)
  }, [suggestedInterestStr])

  const handleAbonoKindChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as "interest" | "principal"
    setAbonoKind(next)
    if (next === "interest") {
      setInterestOnlyAmount(suggestedInterestStr)
      return
    }
    setPrincipalAmountInput("")
    setCapitalPairInterestInput(suggestedInterestStr)
  }

  const handleDisburse = () => {
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await disburseLoan(loan.id)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Desembolso realizado")
      router.refresh()
    })
  }

  const handleCancel = () => {
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await cancelLoanDraft(loan.id)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Préstamo cancelado")
      router.refresh()
    })
  }

  const handleUpdateDraft = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set("id", loan.id)
    startTransition(async () => {
      const r = await updateLoanDraft(fd)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Borrador actualizado")
      setEditDraftOpen(false)
      router.refresh()
    })
  }

  const handleRegisterAbono = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set("loan_id", loan.id)
    startTransition(async () => {
      const r = await registerLoanAbono(fd)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg("Abono registrado")
      setAbonoOpen(false)
      if (form.isConnected) {
        form.reset()
      }
      router.refresh()
    })
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

      {isDraft ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleOpenEditDraft}
            className={buttonSecondaryClass}
            aria-haspopup="dialog"
          >
            Editar borrador
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDisburse}
              disabled={isPending}
              className={buttonPrimaryClass}
            >
              Desembolsar (activar)
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

          <Modal
            open={editDraftOpen}
            onClose={() => setEditDraftOpen(false)}
            title="Editar borrador"
            titleId="modal-editar-borrador-prestamo-title"
            panelClassName="max-w-xl"
          >
            <form key={draftFormKey} onSubmit={handleUpdateDraft} className="grid gap-4 tablet:grid-cols-2">
              <input type="hidden" name="id" value={loan.id} />
              <div>
                <label htmlFor="ld_principal" className={labelClass}>
                  Principal
                </label>
                <input
                  id="ld_principal"
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
              <label htmlFor="ld_monthly_interest_rate" className={labelClass}>
                Tasa mensual %
              </label>
              <input
                id="ld_monthly_interest_rate"
                name="monthly_interest_rate"
                type="text"
                required
                defaultValue={loan.monthly_interest_rate}
                className={inputClass}
                disabled={isPending}
              />
              </div>
              <div>
                <label htmlFor="ld_term_months" className={labelClass}>
                  Plazo referencial (meses)
                </label>
                <input
                  id="ld_term_months"
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
                <label htmlFor="ld_payment_frequency" className={labelClass}>
                  Frecuencia
                </label>
                <select
                  id="ld_payment_frequency"
                  name="payment_frequency"
                  defaultValue={loan.payment_frequency}
                  className={selectClass}
                  disabled={isPending}
                >
                  <option value="monthly">Mensual</option>
                  <option value="biweekly">Quincenal</option>
                </select>
              </div>
              <div className="tablet:col-span-2">
                <label htmlFor="ld_purpose" className={labelClass}>
                  Finalidad
                </label>
                <input
                  id="ld_purpose"
                  name="purpose"
                  defaultValue={loan.purpose ?? ""}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-wrap gap-3 tablet:col-span-2">
                <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
                  Guardar borrador
                </button>
                <button
                  type="button"
                  onClick={() => setEditDraftOpen(false)}
                  disabled={isPending}
                  className={buttonSecondaryClass}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </Modal>
        </div>
      ) : null}

      {isActive ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Saldo pendiente:{" "}
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatMoney(
                outstandingPrincipal,
                loan.liquidity_pools?.currency ?? undefined
              )}
            </span>
            {suggestedMonthlyInterest > 0 ? (
              <>
                {" "}
                · Interés mensual sugerido:{" "}
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatMoney(
                    suggestedMonthlyInterest,
                    loan.liquidity_pools?.currency ?? undefined
                  )}
                </span>
              </>
            ) : null}
          </p>
          <button
            type="button"
            onClick={handleOpenAbono}
            disabled={isPending || !canRegisterAbono}
            className={buttonPrimaryClass}
            title={
              !canRegisterAbono ? "Sin saldo pendiente que registrar" : undefined
            }
            aria-haspopup="dialog"
          >
            Registrar abono
          </button>

          <Modal
            open={abonoOpen}
            onClose={() => setAbonoOpen(false)}
            title="Registrar abono"
            titleId="modal-registrar-abono-prestamo-title"
            panelClassName="max-w-xl"
          >
            <p
              id="abono-modal-hint"
              className="mb-4 text-xs text-zinc-500 dark:text-zinc-400"
            >
              Con tipo <span className="font-medium">Interés</span> registras solo interés. Con
              tipo <span className="font-medium">Capital</span> indicas abono a capital e interés
              en el mismo movimiento. El capital no puede superar el saldo (
              {formatMoney(
                outstandingPrincipal,
                loan.liquidity_pools?.currency ?? undefined
              )}
              ).
            </p>
            <form
              key={abonoFormKey}
              onSubmit={handleRegisterAbono}
              className="space-y-4"
              aria-describedby="abono-modal-hint"
            >
              <div>
                <label htmlFor="abono_kind" className={labelClass}>
                  Tipo de abono
                </label>
                <select
                  id="abono_kind"
                  name="abono_kind"
                  required
                  className={selectClass}
                  disabled={isPending}
                  value={abonoKind}
                  onChange={handleAbonoKindChange}
                >
                  <option value="interest">Interés</option>
                  <option value="principal">Capital</option>
                </select>
              </div>
              {abonoKind === "interest" ? (
                <div>
                  <label htmlFor="abono_interest_only" className={labelClass}>
                    Interés
                  </label>
                  <input
                    id="abono_interest_only"
                    name="interest_amount"
                    type="text"
                    inputMode="decimal"
                    required
                    autoComplete="off"
                    value={interestOnlyAmount}
                    onChange={(e) => setInterestOnlyAmount(e.target.value)}
                    className={inputClass}
                    disabled={isPending}
                    aria-describedby="abono-interest-only-hint"
                  />
                  <p
                    id="abono-interest-only-hint"
                    className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    Sugerido (tasa sobre saldo):{" "}
                    {suggestedMonthlyInterest > 0
                      ? formatMoney(
                          suggestedMonthlyInterest,
                          loan.liquidity_pools?.currency ?? undefined
                        )
                      : "—"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="abono_principal_part" className={labelClass}>
                      Capital
                    </label>
                    <input
                      id="abono_principal_part"
                      name="principal_amount"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={principalAmountInput}
                      onChange={(e) => setPrincipalAmountInput(e.target.value)}
                      className={inputClass}
                      disabled={isPending}
                      placeholder="0"
                      aria-describedby="abono-principal-hint"
                    />
                    <p
                      id="abono-principal-hint"
                      className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
                    >
                      Máximo:{" "}
                      {formatMoney(
                        outstandingPrincipal,
                        loan.liquidity_pools?.currency ?? undefined
                      )}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="abono_interest_with_capital" className={labelClass}>
                      Interés
                    </label>
                    <input
                      id="abono_interest_with_capital"
                      name="interest_amount"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={capitalPairInterestInput}
                      onChange={(e) => setCapitalPairInterestInput(e.target.value)}
                      className={inputClass}
                      disabled={isPending}
                      placeholder="0"
                      aria-describedby="abono-interest-pair-hint"
                    />
                    <p
                      id="abono-interest-pair-hint"
                      className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
                    >
                      Sugerido (tasa sobre saldo):{" "}
                      {suggestedMonthlyInterest > 0
                        ? formatMoney(
                            suggestedMonthlyInterest,
                            loan.liquidity_pools?.currency ?? undefined
                          )
                        : "—"}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="abono_notes" className={labelClass}>
                  Notas
                </label>
                <input
                  id="abono_notes"
                  name="notes"
                  type="text"
                  className={inputClass}
                  disabled={isPending}
                  autoComplete="off"
                  placeholder="Opcional"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={isPending} className={buttonPrimaryClass}>
                  Registrar abono
                </button>
                <button
                  type="button"
                  onClick={() => setAbonoOpen(false)}
                  disabled={isPending}
                  className={buttonSecondaryClass}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </Modal>
        </div>
      ) : null}

      {!isDraft && !isActive ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Este préstamo está en estado «{labelLoanStatus(loan.status)}». No hay acciones
          disponibles.
        </p>
      ) : null}
    </div>
  )
}
