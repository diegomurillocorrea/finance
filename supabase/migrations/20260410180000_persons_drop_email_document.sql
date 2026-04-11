-- Remove email and document fields from persons (no longer used in app).
ALTER TABLE public.persons
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS document_type,
  DROP COLUMN IF EXISTS document_number;
