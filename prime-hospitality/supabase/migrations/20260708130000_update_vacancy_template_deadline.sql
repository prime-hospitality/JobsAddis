-- Modify vacancy_templates to use a fixed date for deadline instead of days
ALTER TABLE public.vacancy_templates
  ADD COLUMN IF NOT EXISTS deadline TEXT,
  DROP COLUMN IF EXISTS deadline_days;
