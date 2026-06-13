-- Create storage buckets for CVs and Logos
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('resumes', 'resumes', true),
  ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid errors if run multiple times)
DROP POLICY IF EXISTS "Public read resumes" ON storage.objects;
DROP POLICY IF EXISTS "Anon/Auth insert resumes" ON storage.objects;
DROP POLICY IF EXISTS "Anon/Auth update resumes" ON storage.objects;
DROP POLICY IF EXISTS "Anon/Auth delete resumes" ON storage.objects;

DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
DROP POLICY IF EXISTS "Anon/Auth insert logos" ON storage.objects;
DROP POLICY IF EXISTS "Anon/Auth update logos" ON storage.objects;
DROP POLICY IF EXISTS "Anon/Auth delete logos" ON storage.objects;

-- Create policies for resumes bucket
CREATE POLICY "Public read resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes');
CREATE POLICY "Anon/Auth insert resumes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "Anon/Auth update resumes" ON storage.objects FOR UPDATE USING (bucket_id = 'resumes');
CREATE POLICY "Anon/Auth delete resumes" ON storage.objects FOR DELETE USING (bucket_id = 'resumes');

-- Create policies for logos bucket
CREATE POLICY "Public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Anon/Auth insert logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Anon/Auth update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');
CREATE POLICY "Anon/Auth delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'logos');
