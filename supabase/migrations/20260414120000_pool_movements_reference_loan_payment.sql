-- Vincula movimientos del fondo a un pago de préstamo concreto (edición / borrado seguros)
ALTER TABLE public.pool_movements
  ADD COLUMN IF NOT EXISTS reference_loan_payment_id uuid
  REFERENCES public.loan_payments (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pool_movements_reference_loan_payment_id_idx
  ON public.pool_movements (reference_loan_payment_id)
  WHERE reference_loan_payment_id IS NOT NULL;
