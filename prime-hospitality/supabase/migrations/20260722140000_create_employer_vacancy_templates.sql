-- ==========================================
-- 20260722140000_create_employer_vacancy_templates.sql
-- Per-employer vacancy templates for the Employer Dashboard's own
-- "Vacancy Template" tab. Intentionally a separate table from
-- public.vacancy_templates (the admin/platform template library) so the
-- two feature areas share no data.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.employer_vacancy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  job_category TEXT NOT NULL,
  description_template TEXT NOT NULL,
  requirements_template TEXT NOT NULL DEFAULT '',
  location TEXT,
  employment_type TEXT DEFAULT 'Full Time',
  salary_type TEXT DEFAULT 'fixed',
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'ETB',
  salary_period TEXT DEFAULT 'Monthly',
  experience_required TEXT,
  responsibilities_template TEXT,
  benefits_template TEXT,
  deadline TEXT,
  quantity INTEGER DEFAULT 1,
  education_requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employer_vacancy_templates_employer_id_idx
  ON public.employer_vacancy_templates(employer_id);

-- Row Level Security: locked down to the service role only (the Employer
-- Dashboard server actions always use the service role key). No anon/
-- authenticated policies are defined, so this table is not reachable from
-- the admin dashboard or any other employer's session.
ALTER TABLE public.employer_vacancy_templates ENABLE ROW LEVEL SECURITY;
