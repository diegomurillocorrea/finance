const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(amount: number, currencyCode = "MXN"): string {
  if (currencyCode !== "MXN") {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  return mxn.format(amount)
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
