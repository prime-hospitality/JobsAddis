-- Add quantity and education_requirements to vacancy_templates
ALTER TABLE public.vacancy_templates
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS education_requirements TEXT;
