-- Add the scheduled_at column
ALTER TABLE jobs ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;

-- Update the jobs_status_check constraint to allow 'scheduled'
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check 
  CHECK (status IN ('pending', 'active', 'closed', 'rejected', 'expired', 'scheduled'));
