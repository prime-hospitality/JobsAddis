ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS renewal_requested_at timestamptz;
ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS renewal_seen_at timestamptz;
