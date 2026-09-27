-- ============================================================
-- Event-SaaS-Plattform – Migration 006
-- Fix: Event-Admins konnten Storage-Objekte nicht LESEN (nur löschen).
-- Ohne das schlägt createSignedUrl() für Admins fehl, und die
-- Moderationsansicht kann keine Bilder pending Posts anzeigen.
-- ============================================================

DROP POLICY IF EXISTS "guests_read_own_event_media" ON storage.objects;
DROP POLICY IF EXISTS "read_own_event_media" ON storage.objects;

CREATE POLICY "read_own_event_media"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'event-media'
    AND (
        EXISTS (
            SELECT 1 FROM public.guests g
            WHERE g.user_id = auth.uid()
            AND g.event_id::text = split_part(name, '/', 1)
        )
        OR public.is_event_admin((split_part(name, '/', 1))::uuid)
    )
);
