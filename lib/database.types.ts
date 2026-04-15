/** Alineado al esquema SQL en Supabase (nombres en inglés) */

export type PersonStatus = "active" | "inactive"
export type SavingsAccountStatus = "active" | "closed" | "suspended"
export type SavingsTransactionType =
  | "deposit"
  | "withdrawal"
  | "interest_credit"
  | "adjustment"
export type PoolMovementType =
  | "contribution_from_savings"
  | "withdrawal_to_savings"
  | "loan_disbursement"
  | "loan_repayment_principal"
  | "loan_repayment_interest"
  | "adjustment"
export type LoanStatus =
  | "draft"
  | "pending_approval"
  | "active"
  | "paid"
  | "defaulted"
  | "cancelled"
export type InstallmentStatus = "pending" | "partial" | "paid" | "overdue"

export interface PersonRow {
  id: string
  auth_user_id: string | null
  full_name: string
  phone: string | null
  bank_id: string | null
  bank_account_number: string | null
  is_member: boolean
  status: PersonStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BankRow {
  id: string
  name: string
  created_at: string
}

export interface LiquidityPoolRow {
  id: string
  name: string
  currency: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface SavingsAccountRow {
  id: string
  person_id: string
  liquidity_pool_id: string
  currency: string
  status: SavingsAccountStatus
  opened_at: string
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface SavingsTransactionRow {
  id: string
  account_id: string
  type: SavingsTransactionType
  amount: string
  occurred_at: string
  idempotency_key: string | null
  description: string | null
  created_at: string
}

export interface PoolMovementRow {
  id: string
  pool_id: string
  type: PoolMovementType
  amount: string
  occurred_at: string
  reference_loan_id: string | null
  reference_savings_transaction_id: string | null
  reference_loan_payment_id: string | null
  idempotency_key: string | null
  description: string | null
  created_at: string
}

export interface LoanRow {
  id: string
  borrower_id: string
  liquidity_pool_id: string
  principal: string
  monthly_interest_rate: string
  term_months: number
  payment_frequency: string
  disbursed_at: string | null
  maturity_date: string | null
  status: LoanStatus
  purpose: string | null
  created_at: string
  updated_at: string
}

export interface LoanInstallmentRow {
  id: string
  loan_id: string
  installment_number: number
  due_date: string
  principal_due: string
  interest_due: string
  total_due: string
  status: InstallmentStatus
  paid_at: string | null
  created_at: string
}

export interface LoanPaymentRow {
  id: string
  loan_id: string
  paid_at: string
  amount: string
  principal_portion: string
  interest_portion: string
  penalty_portion: string
  notes: string | null
  idempotency_key: string | null
  created_at: string
}
