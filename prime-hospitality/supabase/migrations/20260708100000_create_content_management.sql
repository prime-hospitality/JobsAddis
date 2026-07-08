-- Create FAQs table
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: public can read active FAQs, only service role can write
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active FAQs" ON public.faqs FOR SELECT USING (is_active = true);

-- Create Vacancy Templates table
CREATE TABLE IF NOT EXISTS public.vacancy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  job_category TEXT NOT NULL,
  description_template TEXT NOT NULL,
  requirements_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: authenticated employers can read active templates, only service role can write
ALTER TABLE public.vacancy_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employers can read active templates" ON public.vacancy_templates FOR SELECT TO authenticated USING (is_active = true);


-- Create Onboarding Config table
CREATE TABLE IF NOT EXISTS public.onboarding_config (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: public can read, only service role can write
ALTER TABLE public.onboarding_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read onboarding config" ON public.onboarding_config FOR SELECT USING (true);


-- Insert Seed Data for FAQs
INSERT INTO public.faqs (question, answer, display_order) VALUES
('What is Jobs Addis?', 'Jobs Addis by Prime Hospitality is a specialized job platform connecting hospitality professionals with leading hotels, restaurants, and service businesses across Addis Ababa.', 10),
('How do I apply for a job?', 'Browse available jobs on the Home or Search tab. Tap any job card to view the full details, then press the Apply button. Your Telegram profile will be shared with the employer.', 20),
('Is my personal information safe?', 'Yes. We only share information you explicitly provide during onboarding with the employers you apply to. We do not sell your data to any third parties.', 30),
('How long does it take to hear back from an employer?', 'Response times vary by employer. Most active listings receive candidate reviews within 2–5 business days. You will be notified directly through this app if there is an update on your application.', 40),
('Can I apply to more than one job at a time?', 'Absolutely. There is no limit on the number of jobs you can apply for. We encourage you to apply to any role that matches your experience and interests.', 50),
('How do I update my profile?', 'Tap the Profile tab at the bottom of the screen. Then tap the Settings gear icon. From there you can edit your roles, experience level, and location.', 60),
('What if a job listing looks suspicious or fraudulent?', 'Please report it immediately using the flag icon on the job detail page, or contact us directly via the support channels below. We take job quality very seriously and review all reports within 24 hours.', 70),
('I''m an employer. How do I post a job?', 'Employer accounts are managed through our Admin Dashboard. Please reach out to us via Telegram or email to get your business registered on the platform.', 80)
ON CONFLICT DO NOTHING;

-- Insert Seed Data for Onboarding Config
INSERT INTO public.onboarding_config (key, label, value) VALUES
('welcome_title', 'Welcome to Jobs Addis', 'What role are you looking for?'),
('welcome_subtitle', 'Select your categories', 'Select up to 3 categories.'),
('step6_headline', 'You''re All Set!', 'Your profile has been created successfully.'),
('step6_body', 'Start Exploring Jobs', 'You can now browse and apply to hospitality jobs across Addis Ababa.')
ON CONFLICT (key) DO NOTHING;
