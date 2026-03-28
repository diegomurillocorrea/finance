/**
 * Etiquetas en español para valores guardados en inglés en la base de datos.
 * La clave sigue siendo el valor crudo (API / DB); la UI usa estas funciones.
 */

const SAVINGS_TRANSACTION: Record<string, string> = {
  deposit: "Depósito",
  withdrawal: "Retiro",
  interest_credit: "Abono de intereses",
  adjustment: "Ajuste",
}

const POOL_MOVEMENT: Record<string, string> = {
  contribution_from_savings: "Aporte desde ahorro",
  withdrawal_to_savings: "Retiro hacia ahorro",
  loan_disbursement: "Desembolso de préstamo",
  loan_repayment_principal: "Cobro de capital (préstamo)",
  loan_repayment_interest: "Cobro de intereses (préstamo)",
  adjustment: "Ajuste",
}

const LOAN_STATUS: Record<string, string> = {
  draft: "Borrador",
  pending_approval: "Pendiente de aprobación",
  active: "Activo",
  paid: "Liquidado",
  defaulted: "En incumplimiento",
  cancelled: "Cancelado",
}

const SAVINGS_ACCOUNT_STATUS: Record<string, string> = {
  active: "Activa",
  closed: "Cerrada",
  suspended: "Suspendida",
}

const INSTALLMENT_STATUS: Record<string, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Pagada",
  overdue: "Vencida",
}

const PERSON_STATUS: Record<string, string> = {
  active: "Activa",
  inactive: "Inactiva",
}

const PAYMENT_FREQUENCY: Record<string, string> = {
  monthly: "Mensual",
  biweekly: "Quincenal",
}

function pick(map: Record<string, string>, key: string): string {
  return map[key] ?? key
}

export function labelSavingsTransactionType(type: string): string {
  return pick(SAVINGS_TRANSACTION, type)
}

export function labelPoolMovementType(type: string): string {
  return pick(POOL_MOVEMENT, type)
}

export function labelLoanStatus(status: string): string {
  return pick(LOAN_STATUS, status)
}

export function labelSavingsAccountStatus(status: string): string {
  return pick(SAVINGS_ACCOUNT_STATUS, status)
}

export function labelInstallmentStatus(status: string): string {
  return pick(INSTALLMENT_STATUS, status)
}

export function labelPersonStatus(status: string): string {
  return pick(PERSON_STATUS, status)
}

export function labelPaymentFrequency(value: string): string {
  return pick(PAYMENT_FREQUENCY, value)
}
