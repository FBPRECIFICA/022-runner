-- BLOCO 77 — link do percurso (Garmin/Strava/Komoot) por evento

ALTER TABLE events ADD COLUMN IF NOT EXISTS link_percurso TEXT;

UPDATE events SET link_percurso = 'https://connect.garmin.com/modern/course/482106032' WHERE title ILIKE '%Arena%';
