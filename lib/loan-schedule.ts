export interface ScheduleRow {
  installmentNumber: number
  dueDate: string
  principalDue: number
  interestDue: number
  totalDue: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function addMonthsUtc(isoDate: string, monthsToAdd: number): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + monthsToAdd
  const day = d.getUTCDate()
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const dayClamped = Math.min(day, last)
  const next = new Date(Date.UTC(y, m, dayClamped))
  return next.toISOString().slice(0, 10)
}

/**
 * Cuotas mensuales tipo francés (cuota fija). Tasa anual en porcentaje (ej. 24 = 24 %).
 */
export function buildAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
  firstDueDateIso: string
): ScheduleRow[] {
  if (termMonths < 1 || principal <= 0) return []

  const r = annualRatePercent / 100 / 12
  let balance = round2(principal)
  const rows: ScheduleRow[] = []

  let payment: number
  if (r === 0) {
    payment = round2(principal / termMonths)
  } else {
    const pow = Math.pow(1 + r, termMonths)
    payment = round2((principal * r * pow) / (pow - 1))
  }

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonthsUtc(firstDueDateIso, i)
    const interestDue = round2(balance * r)
    let principalDue = round2(payment - interestDue)

    if (i === termMonths) {
      principalDue = round2(balance)
    }

    const totalDue = round2(principalDue + interestDue)
    balance = round2(balance - principalDue)
    if (balance < 0) balance = 0

    rows.push({
      installmentNumber: i,
      dueDate,
      principalDue,
      interestDue,
      totalDue,
    })
  }

  return rows
}
