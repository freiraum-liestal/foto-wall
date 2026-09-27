-- ============================================================
-- Event-SaaS-Plattform – Storage Video Mime Types (Migration 009)
-- Ergänzt video/webm und stellt sicher, dass MP4, QuickTime/MOV
-- und WebM mit 50 MB Dateigrössenlimit erlaubt sind.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'event-media',
    'event-media',
    FALSE,
    52428800, -- 50 MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
