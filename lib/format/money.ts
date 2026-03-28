import { APP_CURRENCY_CODE } from "@/lib/constants/currency"

const usd = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: APP_CURRENCY_CODE,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(amount: number, currencyCode: string = APP_CURRENCY_CODE): string {
  if (currencyCode === APP_CURRENCY_CODE) {
    return usd.format(amount)
  }
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function parseMoneyInput(value: string): number | null {
  const normalized = value.replace(/,/g, ".").replace(/[^\d.-]/g, "")
  if (normalized === "" || normalized === "-") return null
  const n = Number(normalized)
  if (Number.isNaN(n)) return null
  return Math.round(n * 100) / 100
}

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}
