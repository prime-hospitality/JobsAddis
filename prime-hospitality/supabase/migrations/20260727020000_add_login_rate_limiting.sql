ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS auth_code_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS auth_code_locked_until timestamptz;

CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  username text PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz
);
