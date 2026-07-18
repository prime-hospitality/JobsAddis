-- Add password_hash column to employers table for the new onboarding flow
ALTER TABLE employers ADD COLUMN password_hash TEXT DEFAULT NULL;
