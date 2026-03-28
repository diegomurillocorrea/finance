import { toNumber } from "@/lib/format/money"

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Suma de abonos a capital registrados en pagos */
export function totalPrincipalRepaidFromRows(
  rows: { principal_portion: string | number }[]
): number {
  const sum = rows.reduce((acc, row) => acc + toNumber(row.principal_portion), 0)
  return round2(sum)
}

/** Capital original menos abonos a capital */
export function outstandingPrincipal(
  originalPrincipal: number,
  totalPrincipalRepaid: number
): number {
  return round2(Math.max(0, originalPrincipal - totalPrincipalRepaid))
}

/**
 * Interés del periodo (mensual) sobre saldo insoluto: saldo × tasa%/100
 */
export function monthlyInterestOnOutstanding(
  outstanding: number,
  monthlyRatePercent: number
): number {
  if (outstanding <= 0) return 0
  return round2(outstanding * (monthlyRatePercent / 100))
}
