import type { ZodError } from "zod"

export function zodFirstMessage(error: ZodError, fallback = "Datos inválidos"): string {
  return error.issues[0]?.message ?? fallback
}
