-- ============================================================
-- Event-SaaS-Plattform – Storage (Migration 003)
-- Ordnerstruktur: event-media/{event_id}/{guest_id}/{dateiname}
--
-- WICHTIG – Abweichung vom alten Bucket:
-- Der Bucket ist NICHT öffentlich. Lesezugriff nur für Gäste,
-- die nachweislich zu genau diesem Event gehören. Für die
-- Beamer-/Projector-Ansicht werden signierte URLs empfohlen
-- (serverseitig via Service-Role in einer Next.js API-Route),
-- statt den Bucket komplett öffentlich zu machen.
-- ============================================================

DROP POLICY IF EXISTS "guests_upload_media" ON storage.objects;
DROP POLICY IF EXISTS "guests_read_own_event_media" ON storage.objects;
DROP POLICY IF EXISTS "guests_delete_own_media" ON storage.objects;
DROP POLICY IF EXISTS "event_admins_delete_media" ON storage.objects;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'event-media',
    'event-media',
    FALSE, -- NICHT öffentlich (Unterschied zum alten Bucket!)
    52428800, -- 50 MB Limit (Video-Support)
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];

-- 1. Gäste dürfen NUR in ihren eigenen Ordner innerhalb IHRES Events hochladen
CREATE POLICY "guests_upload_media"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'event-media'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.guests g
        WHERE g.user_id = auth.uid()
        AND g.blocked = FALSE
        AND g.event_id::text = (storage.foldername(name))[1]
        AND g.id::text = (storage.foldername(name))[2]
    )
);

-- 2. Lesen: nur Gäste desselben Events (kein globaler Public-Read mehr)
CREATE POLICY "guests_read_own_event_media"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'event-media'
    AND EXISTS (
        SELECT 1 FROM public.guests g
        WHERE g.user_id = auth.uid()
        AND g.event_id::text = (storage.foldername(name))[1]
    )
);

-- 3. Gäste löschen eigene Dateien
CREATE POLICY "guests_delete_own_media"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'event-media'
    AND EXISTS (
        SELECT 1 FROM public.guests g
        WHERE g.user_id = auth.uid()
        AND g.event_id::text = (storage.foldername(name))[1]
        AND g.id::text = (storage.foldername(name))[2]
    )
);

-- 4. Event-Admins löschen alle Dateien ihres Events
CREATE POLICY "event_admins_delete_media"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'event-media'
    AND public.is_event_admin(((storage.foldername(name))[1])::uuid)
);
