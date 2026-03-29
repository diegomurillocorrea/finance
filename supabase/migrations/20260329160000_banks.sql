-- Catálogo de bancos (solo id, nombre, fecha de creación)

CREATE TABLE IF NOT EXISTS public.banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS banks_name_idx ON public.banks (name);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banks_authenticated_select" ON public.banks;
DROP POLICY IF EXISTS "banks_authenticated_insert" ON public.banks;
DROP POLICY IF EXISTS "banks_authenticated_update" ON public.banks;
DROP POLICY IF EXISTS "banks_authenticated_delete" ON public.banks;

CREATE POLICY "banks_authenticated_select" ON public.banks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "banks_authenticated_insert" ON public.banks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "banks_authenticated_update" ON public.banks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "banks_authenticated_delete" ON public.banks
  FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banks TO authenticated;
