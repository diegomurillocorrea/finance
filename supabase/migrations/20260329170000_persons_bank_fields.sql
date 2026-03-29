-- Datos de cuenta bancaria de ahorro por persona (opcional)

ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS bank_id uuid REFERENCES public.banks (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bank_account_number text;

CREATE INDEX IF NOT EXISTS persons_bank_id_idx ON public.persons (bank_id);
