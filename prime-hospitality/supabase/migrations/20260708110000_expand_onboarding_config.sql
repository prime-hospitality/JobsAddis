-- Expand Onboarding Config Keys
INSERT INTO public.onboarding_config (key, label, value) VALUES
('step1_title', 'Step 1: Welcome Title', 'What role are you looking for?'),
('step1_subtitle', 'Step 1: Welcome Subtitle', 'Select up to 3 categories.'),
('step1_categories', 'Step 1: Job Categories (JSON)', '[{"label":"Reception","emoji":"🛎️"},{"label":"Waiter","emoji":"🍽️"},{"label":"Chef","emoji":"👨‍🍳"},{"label":"IT Officer","emoji":"💻"},{"label":"Housekeeper","emoji":"🧹"},{"label":"Steward","emoji":"🫧"},{"label":"Cashier","emoji":"💳"},{"label":"Executive Chef","emoji":"👑"},{"label":"Sous Chef","emoji":"🧑‍🍳"},{"label":"Barista","emoji":"☕"},{"label":"Night Auditor","emoji":"🌙"},{"label":"Guest Relations Officer","emoji":"🤝"},{"label":"Reservations Agent","emoji":"📅"},{"label":"Security","emoji":"🛡️"},{"label":"Cook","emoji":"🍳"},{"label":"Driver","emoji":"🚗"},{"label":"Marketing & Sales","emoji":"📈"},{"label":"F&B","emoji":"🍹"},{"label":"Finance","emoji":"💰"},{"label":"Cost Control","emoji":"📊"},{"label":"Accountant","emoji":"🧮"},{"label":"Bellboy","emoji":"🧳"},{"label":"Maintenance","emoji":"🔧"},{"label":"Painter","emoji":"🎨"},{"label":"Spa Attendant","emoji":"💆"},{"label":"Gym Trainer","emoji":"🏋️"},{"label":"Lifeguard","emoji":"🛟"},{"label":"Banquet","emoji":"🥂"},{"label":"Other","emoji":"✨"}]'),
('step2_title', 'Step 2: Contact Sharing Title', 'Can we share your contact with employers?'),
('step2_subtitle', 'Step 2: Contact Sharing Subtitle', 'This helps employers reach you faster when they want to hire you.'),
('step3_title', 'Step 3: Experience Level Title', 'What is your experience level?'),
('step3_subtitle', 'Step 3: Experience Level Subtitle', 'Select for each of your chosen roles.'),
('step3_experience_levels', 'Step 3: Experience Levels (JSON)', '["No Experience", "Less than 1 year", "1 to 2 years", "3 to 5 years", "5+ years"]'),
('step4_title', 'Step 4: Personal Details Title', 'Tell us a bit about yourself'),
('step5_title', 'Step 5: CV Upload Title', 'Upload your CV'),
('step5_subtitle', 'Step 5: CV Upload Subtitle', 'PDF or Word document. Max 5MB.')
ON CONFLICT (key) DO UPDATE SET 
  label = EXCLUDED.label,
  value = EXCLUDED.value;
