-- =============================================================================
-- RLS explícito + permisos para rol authenticated (Supabase)
-- Ejecuta esto si ves: "new row violates row-level security policy"
--
-- 1) Elimina políticas MVP previas (si existían)
-- 2) Crea SELECT / INSERT / UPDATE / DELETE por tabla
-- 3) Concede permisos de tablas al rol authenticated
-- =============================================================================

-- --- persons ---
DROP POLICY IF EXISTS "persons_authenticated_all" ON public.persons;
DROP POLICY IF EXISTS "persons_authenticated_select" ON public.persons;
DROP POLICY IF EXISTS "persons_authenticated_insert" ON public.persons;
DROP POLICY IF EXISTS "persons_authenticated_update" ON public.persons;
DROP POLICY IF EXISTS "persons_authenticated_delete" ON public.persons;

CREATE POLICY "persons_authenticated_select" ON public.persons
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "persons_authenticated_insert" ON public.persons
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "persons_authenticated_update" ON public.persons
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "persons_authenticated_delete" ON public.persons
  FOR DELETE TO authenticated USING (true);

-- --- liquidity_pools ---
DROP POLICY IF EXISTS "liquidity_pools_authenticated_all" ON public.liquidity_pools;
DROP POLICY IF EXISTS "liquidity_pools_authenticated_select" ON public.liquidity_pools;
DROP POLICY IF EXISTS "liquidity_pools_authenticated_insert" ON public.liquidity_pools;
DROP POLICY IF EXISTS "liquidity_pools_authenticated_update" ON public.liquidity_pools;
DROP POLICY IF EXISTS "liquidity_pools_authenticated_delete" ON public.liquidity_pools;

CREATE POLICY "liquidity_pools_authenticated_select" ON public.liquidity_pools
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "liquidity_pools_authenticated_insert" ON public.liquidity_pools
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "liquidity_pools_authenticated_update" ON public.liquidity_pools
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "liquidity_pools_authenticated_delete" ON public.liquidity_pools
  FOR DELETE TO authenticated USING (true);

-- --- savings_accounts ---
DROP POLICY IF EXISTS "savings_accounts_authenticated_all" ON public.savings_accounts;
DROP POLICY IF EXISTS "savings_accounts_authenticated_select" ON public.savings_accounts;
DROP POLICY IF EXISTS "savings_accounts_authenticated_insert" ON public.savings_accounts;
DROP POLICY IF EXISTS "savings_accounts_authenticated_update" ON public.savings_accounts;
DROP POLICY IF EXISTS "savings_accounts_authenticated_delete" ON public.savings_accounts;

CREATE POLICY "savings_accounts_authenticated_select" ON public.savings_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "savings_accounts_authenticated_insert" ON public.savings_accounts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "savings_accounts_authenticated_update" ON public.savings_accounts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "savings_accounts_authenticated_delete" ON public.savings_accounts
  FOR DELETE TO authenticated USING (true);

-- --- savings_transactions ---
DROP POLICY IF EXISTS "savings_transactions_authenticated_all" ON public.savings_transactions;
DROP POLICY IF EXISTS "savings_transactions_authenticated_select" ON public.savings_transactions;
DROP POLICY IF EXISTS "savings_transactions_authenticated_insert" ON public.savings_transactions;
DROP POLICY IF EXISTS "savings_transactions_authenticated_update" ON public.savings_transactions;
DROP POLICY IF EXISTS "savings_transactions_authenticated_delete" ON public.savings_transactions;

CREATE POLICY "savings_transactions_authenticated_select" ON public.savings_transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "savings_transactions_authenticated_insert" ON public.savings_transactions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "savings_transactions_authenticated_update" ON public.savings_transactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "savings_transactions_authenticated_delete" ON public.savings_transactions
  FOR DELETE TO authenticated USING (true);

-- --- pool_movements ---
DROP POLICY IF EXISTS "pool_movements_authenticated_all" ON public.pool_movements;
DROP POLICY IF EXISTS "pool_movements_authenticated_select" ON public.pool_movements;
DROP POLICY IF EXISTS "pool_movements_authenticated_insert" ON public.pool_movements;
DROP POLICY IF EXISTS "pool_movements_authenticated_update" ON public.pool_movements;
DROP POLICY IF EXISTS "pool_movements_authenticated_delete" ON public.pool_movements;

CREATE POLICY "pool_movements_authenticated_select" ON public.pool_movements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pool_movements_authenticated_insert" ON public.pool_movements
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pool_movements_authenticated_update" ON public.pool_movements
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pool_movements_authenticated_delete" ON public.pool_movements
  FOR DELETE TO authenticated USING (true);

-- --- loans ---
DROP POLICY IF EXISTS "loans_authenticated_all" ON public.loans;
DROP POLICY IF EXISTS "loans_authenticated_select" ON public.loans;
DROP POLICY IF EXISTS "loans_authenticated_insert" ON public.loans;
DROP POLICY IF EXISTS "loans_authenticated_update" ON public.loans;
DROP POLICY IF EXISTS "loans_authenticated_delete" ON public.loans;

CREATE POLICY "loans_authenticated_select" ON public.loans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "loans_authenticated_insert" ON public.loans
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "loans_authenticated_update" ON public.loans
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "loans_authenticated_delete" ON public.loans
  FOR DELETE TO authenticated USING (true);

-- --- loan_installments ---
DROP POLICY IF EXISTS "loan_installments_authenticated_all" ON public.loan_installments;
DROP POLICY IF EXISTS "loan_installments_authenticated_select" ON public.loan_installments;
DROP POLICY IF EXISTS "loan_installments_authenticated_insert" ON public.loan_installments;
DROP POLICY IF EXISTS "loan_installments_authenticated_update" ON public.loan_installments;
DROP POLICY IF EXISTS "loan_installments_authenticated_delete" ON public.loan_installments;

CREATE POLICY "loan_installments_authenticated_select" ON public.loan_installments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "loan_installments_authenticated_insert" ON public.loan_installments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "loan_installments_authenticated_update" ON public.loan_installments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "loan_installments_authenticated_delete" ON public.loan_installments
  FOR DELETE TO authenticated USING (true);

-- --- loan_payments ---
DROP POLICY IF EXISTS "loan_payments_authenticated_all" ON public.loan_payments;
DROP POLICY IF EXISTS "loan_payments_authenticated_select" ON public.loan_payments;
DROP POLICY IF EXISTS "loan_payments_authenticated_insert" ON public.loan_payments;
DROP POLICY IF EXISTS "loan_payments_authenticated_update" ON public.loan_payments;
DROP POLICY IF EXISTS "loan_payments_authenticated_delete" ON public.loan_payments;

CREATE POLICY "loan_payments_authenticated_select" ON public.loan_payments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "loan_payments_authenticated_insert" ON public.loan_payments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "loan_payments_authenticated_update" ON public.loan_payments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "loan_payments_authenticated_delete" ON public.loan_payments
  FOR DELETE TO authenticated USING (true);

-- Permisos (por si faltan en el proyecto)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
