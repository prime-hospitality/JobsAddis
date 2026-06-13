-- Harden storage security by preventing UPDATE and DELETE from anon/authenticated clients

-- Drop UPDATE and DELETE policies for resumes
DROP POLICY IF EXISTS "Anon/Auth update resumes" ON storage.objects;
DROP POLICY IF EXISTS "Anon/Auth delete resumes" ON storage.objects;

-- Drop UPDATE and DELETE policies for logos
DROP POLICY IF EXISTS "Anon/Auth update logos" ON storage.objects;
DROP POLICY IF EXISTS "Anon/Auth delete logos" ON storage.objects;
