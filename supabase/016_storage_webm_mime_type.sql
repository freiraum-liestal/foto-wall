-- ============================================================
-- Event-SaaS-Plattform – Migration 016
-- Ergänzt video/webm als erlaubten MIME-Type im event-media-Bucket.
--
-- Hintergrund: Diese Änderung existierte bisher nur im verwaisten
-- SQL/-Ordner (SQL/009_storage_video_webm.sql), der eine andere,
-- nicht mehr aktive Migrationslinie war und gelöscht wurde. Der
-- webm-Support wurde dabei nie in die aktive supabase/-Linie
-- übernommen (003 kennt nur mp4 und quicktime) - wird hier
-- nachgeholt, bevor 015 (Video-Upload-Modul) live geht.
-- ============================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm'
]
WHERE id = 'event-media';
