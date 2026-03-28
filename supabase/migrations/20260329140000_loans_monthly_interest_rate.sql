-- Préstamos: tasa de interés como porcentaje mensual (antes: anual).
ALTER TABLE public.loans
  RENAME COLUMN annual_interest_rate TO monthly_interest_rate;

-- Valores existentes estaban en % anual; equivalencia simple usada antes en código: r_mensual = anual/12 (%).
UPDATE public.loans
SET monthly_interest_rate = (monthly_interest_rate::numeric / 12)
WHERE monthly_interest_rate IS NOT NULL;
