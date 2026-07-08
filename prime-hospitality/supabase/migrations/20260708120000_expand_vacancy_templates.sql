-- Expand vacancy_templates with full job posting fields
ALTER TABLE public.vacancy_templates
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full Time',
  ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS salary_min INTEGER,
  ADD COLUMN IF NOT EXISTS salary_max INTEGER,
  ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'ETB',
  ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'Monthly',
  ADD COLUMN IF NOT EXISTS experience_required TEXT,
  ADD COLUMN IF NOT EXISTS responsibilities_template TEXT,
  ADD COLUMN IF NOT EXISTS benefits_template TEXT,
  ADD COLUMN IF NOT EXISTS deadline_days INTEGER DEFAULT 30;
