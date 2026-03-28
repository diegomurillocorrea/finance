-- =============================================================================
-- MVP: usuarios con sesión Supabase (rol authenticated) pueden usar las tablas
-- Ejecutar en Supabase SQL Editor si ya aplicaste el esquema sin políticas.
-- Ajusta o elimina políticas cuando tengas roles (admin / solo lectura, etc.).
-- =============================================================================

CREATE POLICY "persons_authenticated_all"
  ON public.persons FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "liquidity_pools_authenticated_all"
  ON public.liquidity_pools FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "savings_accounts_authenticated_all"
  ON public.savings_accounts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "savings_transactions_authenticated_all"
  ON public.savings_transactions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "pool_movements_authenticated_all"
  ON public.pool_movements FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "loans_authenticated_all"
  ON public.loans FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "loan_installments_authenticated_all"
  ON public.loan_installments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "loan_payments_authenticated_all"
  ON public.loan_payments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
