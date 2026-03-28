-- =============================================================================
-- Limpia datos operativos: préstamos, cuentas de ahorro, movimientos de fondo
-- y fondos (liquidity_pools).
--
-- NO elimina: public.persons (personas / prestatarios).
--
-- Ejecutar en Supabase: SQL Editor (como postgres o service role), o:
--   psql "$DATABASE_URL" -f scripts/clear-finance-tables.sql
--
-- Recomendación: respaldo o snapshot antes en producción.
-- =============================================================================

BEGIN;

-- 1) Préstamo: hijos primero
DELETE FROM public.loan_payments;
DELETE FROM public.loan_installments;

-- 2) Movimientos de fondo (referencian préstamos y/o transacciones de ahorro)
DELETE FROM public.pool_movements;

-- 3) Préstamos
DELETE FROM public.loans;

-- 4) Cuenta de ahorro: movimientos antes que la cuenta
DELETE FROM public.savings_transactions;
DELETE FROM public.savings_accounts;

-- 5) Fondos
DELETE FROM public.liquidity_pools;

COMMIT;

-- Verificación rápida (opcional, descomenta):
-- SELECT 'loan_payments' AS t, COUNT(*) FROM public.loan_payments
-- UNION ALL SELECT 'loan_installments', COUNT(*) FROM public.loan_installments
-- UNION ALL SELECT 'pool_movements', COUNT(*) FROM public.pool_movements
-- UNION ALL SELECT 'loans', COUNT(*) FROM public.loans
-- UNION ALL SELECT 'savings_transactions', COUNT(*) FROM public.savings_transactions
-- UNION ALL SELECT 'savings_accounts', COUNT(*) FROM public.savings_accounts
-- UNION ALL SELECT 'liquidity_pools', COUNT(*) FROM public.liquidity_pools;
