import { z } from "zod"

/** DUI: 8 dígitos, guion, 1 dígito verificador (ej. 00000000-0) */
export const DUI_NUMBER_REGEX = /^\d{8}-\d$/

export const personCreateSchema = z
  .object({
    full_name: z.string().min(2, "Nombre demasiado corto"),
    email: z.string().max(200).optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    document_type: z.string().optional().or(z.literal("")),
    document_number: z.string().optional().or(z.literal("")),
    is_member: z.boolean().optional(),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine(
    (d) => {
      const e = d.email?.trim()
      if (!e) return true
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    },
    { message: "Email inválido", path: ["email"] }
  )
  .refine(
    (d) => {
      const n = d.document_number?.trim()
      if (!n) return true
      return DUI_NUMBER_REGEX.test(n)
    },
    { message: "El número debe tener el formato DUI: 00000000-0", path: ["document_number"] }
  )

export const personUpdateSchema = personCreateSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
})

export const poolCreateSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  currency: z.string().length(3, "Código ISO de 3 letras").default("MXN"),
  is_default: z.boolean().optional(),
})

export const poolUpdateSchema = poolCreateSchema.extend({
  id: z.string().uuid(),
})

export const savingsAccountCreateSchema = z.object({
  person_id: z.string().uuid(),
  liquidity_pool_id: z.string().uuid(),
  currency: z.string().length(3).default("MXN"),
})

export const savingsMovementSchema = z.object({
  account_id: z.string().uuid(),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  description: z.string().optional().or(z.literal("")),
})

export const loanCreateSchema = z.object({
  borrower_id: z.string().uuid(),
  liquidity_pool_id: z.string().uuid(),
  principal: z.number().positive(),
  annual_interest_rate: z.number().min(0),
  term_months: z.number().int().min(1).max(600),
  payment_frequency: z.string().min(1).default("monthly"),
  purpose: z.string().optional().or(z.literal("")),
  status: z
    .enum(["draft", "pending_approval"])
    .optional()
    .default("draft"),
})

export const loanUpdateDraftSchema = z.object({
  id: z.string().uuid(),
  principal: z.number().positive(),
  annual_interest_rate: z.number().min(0),
  term_months: z.number().int().min(1).max(600),
  payment_frequency: z.string().min(1),
  purpose: z.string().optional().or(z.literal("")),
})

export const customLoanPaymentSchema = z.object({
  loan_id: z.string().uuid(),
  amount: z.number().positive(),
  principal_portion: z.number().min(0),
  interest_portion: z.number().min(0),
  penalty_portion: z.number().min(0).optional(),
  notes: z.string().optional().or(z.literal("")),
})
