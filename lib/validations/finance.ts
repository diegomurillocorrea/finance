import { z } from "zod"

export const personCreateSchema = z
  .object({
    full_name: z.string().min(2, "Nombre demasiado corto"),
    phone: z.string().optional().or(z.literal("")),
    bank_id: z.string().optional().or(z.literal("")),
    bank_account_number: z.string().max(120).optional().or(z.literal("")),
    is_member: z.boolean().optional(),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine(
    (d) => {
      const acc = d.bank_account_number?.trim() ?? ""
      const bid = d.bank_id?.trim() ?? ""
      if (!acc && !bid) return true
      if (!bid || !z.string().uuid().safeParse(bid).success) return false
      if (!acc) return false
      return true
    },
    {
      message:
        "Si indicas cuenta bancaria, elige un banco y escribe el número; si no aplica, deja ambos vacíos",
      path: ["bank_account_number"],
    }
  )

export const personUpdateSchema = personCreateSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
})

export const bankCreateSchema = z.object({
  name: z.string().min(1, "Nombre del banco requerido"),
})

export const bankUpdateSchema = bankCreateSchema.extend({
  id: z.string().uuid(),
})

export const poolCreateSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  is_default: z.boolean().optional(),
})

export const poolUpdateSchema = poolCreateSchema.extend({
  id: z.string().uuid(),
})

export const savingsAccountCreateSchema = z.object({
  person_id: z.string().uuid(),
  liquidity_pool_id: z.string().uuid(),
})

export const savingsMovementSchema = z.object({
  account_id: z.string().uuid(),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  description: z.string().optional().or(z.literal("")),
})

export const savingsTransactionUpdateSchema = z.object({
  transaction_id: z.string().uuid(),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  description: z.string().optional().or(z.literal("")),
  occurred_at: z.string().min(1, "Indica fecha y hora"),
})

export const loanPaymentUpdateSchema = z
  .object({
    payment_id: z.string().uuid(),
    principal_amount: z.number().min(0),
    interest_amount: z.number().min(0),
    notes: z.string().optional().or(z.literal("")),
    paid_at: z.string().min(1, "Indica fecha y hora"),
  })
  .refine((d) => d.principal_amount + d.interest_amount > 0, {
    message: "El monto total debe ser mayor a 0",
    path: ["principal_amount"],
  })

export const loanCreateSchema = z.object({
  borrower_id: z.string().uuid(),
  liquidity_pool_id: z.string().uuid(),
  principal: z.number().positive(),
  monthly_interest_rate: z.number().min(0),
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
  monthly_interest_rate: z.number().min(0),
  term_months: z.number().int().min(1).max(600),
  payment_frequency: z.string().min(1),
  purpose: z.string().optional().or(z.literal("")),
})

export const loanAddPrincipalSchema = z.object({
  loan_id: z.string().uuid(),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  notes: z.string().optional().or(z.literal("")),
})

export const loanDisbursementUpdateSchema = z.object({
  movement_id: z.string().uuid(),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  description: z.string().optional().or(z.literal("")),
  occurred_at: z.string().min(1, "Indica fecha y hora"),
})

export const loanAbonoInterestSchema = z.object({
  loan_id: z.string().uuid(),
  abono_kind: z.literal("interest"),
  interest_amount: z.number().positive(),
  notes: z.string().optional().or(z.literal("")),
})

export const loanAbonoPrincipalSchema = z
  .object({
    loan_id: z.string().uuid(),
    abono_kind: z.literal("principal"),
    principal_amount: z.number().min(0),
    interest_amount: z.number().min(0),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine(
    (d) => d.principal_amount + d.interest_amount > 0,
    { message: "Ingresa capital o interés (o ambos)", path: ["principal_amount"] }
  )
