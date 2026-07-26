-- Add a free-text, bulleted "Experience" field (alongside the existing
-- Requirement Skills field) to both template tables, so it can be composed
-- into the job description the same way Responsibilities/Requirement
-- Skills/Benefits already are.
ALTER TABLE public.vacancy_templates
  ADD COLUMN IF NOT EXISTS experience_template TEXT;

ALTER TABLE public.employer_vacancy_templates
  ADD COLUMN IF NOT EXISTS experience_template TEXT;
