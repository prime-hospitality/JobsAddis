CREATE TABLE IF NOT EXISTS public.dev_tracker (
  id integer PRIMARY KEY DEFAULT 1,
  task_states jsonb NOT NULL DEFAULT '{}'::jsonb,
  task_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Initialize the single row
INSERT INTO public.dev_tracker (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Security
ALTER TABLE public.dev_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on dev_tracker" ON public.dev_tracker FOR SELECT USING (true);
CREATE POLICY "Allow public update on dev_tracker" ON public.dev_tracker FOR UPDATE USING (true) WITH CHECK (true);
