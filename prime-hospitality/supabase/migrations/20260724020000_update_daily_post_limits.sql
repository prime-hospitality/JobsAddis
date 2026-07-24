-- Daily posting limits move from counting "posting actions" to counting
-- individual job rows created per day, at higher caps: standard 3 -> 15,
-- premium 5 -> 30. The platform's own employer account (super admin,
-- tracked via app_config.platform_employer_id) is exempted entirely and
-- posts with no daily restriction.

ALTER TABLE public.employers ALTER COLUMN daily_post_limit SET DEFAULT 15;

UPDATE public.employers
SET daily_post_limit = 15
WHERE daily_post_limit = 3
  AND id IS DISTINCT FROM (SELECT value::uuid FROM public.app_config WHERE key = 'platform_employer_id');

UPDATE public.employers
SET daily_post_limit = 30
WHERE daily_post_limit = 5
  AND id IS DISTINCT FROM (SELECT value::uuid FROM public.app_config WHERE key = 'platform_employer_id');

UPDATE public.employers
SET daily_post_limit = -1
WHERE id = (SELECT value::uuid FROM public.app_config WHERE key = 'platform_employer_id');
