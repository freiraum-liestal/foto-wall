-- ============================================================
-- Event-SaaS-Plattform – Migration 009
-- Fix (verifiziert gegen echtes Supabase-Projekt): Storage-Policies
-- schlugen mit "new row violates row-level security policy" fehl, weil
-- 003/006 rohe EXISTS-Subqueries gegen public.guests in den
-- storage.objects-Policies benutzt haben, statt wie überall sonst
-- SECURITY DEFINER-Hilfsfunktionen. Das war eine Inkonsistenz zum sonst
-- durchgängigen Muster (is_event_admin, is_active_guest_of etc. sind
-- alle SECURITY DEFINER) - hier nachgezogen.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_guest_upload_to_storage(
    p_bucket_id TEXT,
    p_object_name TEXT
)
RETURNS BOOLEAN AS $$
    SELECT p_bucket_id = 'event-media' AND EXISTS (
        SELECT 1 FROM public.guests g
        WHERE g.user_id = auth.uid()
        AND g.blocked = FALSE
        AND g.event_id::text = split_part(p_object_name, '/', 1)
        AND g.id::text = split_part(p_object_name, '/', 2)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_guest_read_storage(
    p_bucket_id TEXT,
    p_object_name TEXT
)
RETURNS BOOLEAN AS $$
    SELECT p_bucket_id = 'event-media' AND (
        EXISTS (
            SELECT 1 FROM public.guests g
            WHERE g.user_id = auth.uid()
            AND g.event_id::text = split_part(p_object_name, '/', 1)
        )
        OR public.is_event_admin(split_part(p_object_name, '/', 1)::uuid)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_delete_event_media(
    p_bucket_id TEXT,
    p_object_name TEXT
)
RETURNS BOOLEAN AS $$
    SELECT p_bucket_id = 'event-media' AND (
        public.can_guest_upload_to_storage(p_bucket_id, p_object_name)
        OR public.is_event_admin(split_part(p_object_name, '/', 1)::uuid)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- Policies neu verdrahten (löst die aus 003/006 ab)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "guests_upload_media" ON storage.objects;
DROP POLICY IF EXISTS "read_own_event_media" ON storage.objects;
DROP POLICY IF EXISTS "guests_read_own_event_media" ON storage.objects; -- alter Name aus 003, falls 006 nicht gelaufen ist
DROP POLICY IF EXISTS "guests_delete_own_media" ON storage.objects;
DROP POLICY IF EXISTS "event_admins_delete_media" ON storage.objects;

CREATE POLICY "guests_upload_media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (public.can_guest_upload_to_storage(bucket_id, name));

CREATE POLICY "read_own_event_media"
ON storage.objects
FOR SELECT
TO authenticated
USING (public.can_guest_read_storage(bucket_id, name));

CREATE POLICY "delete_own_or_admin_event_media"
ON storage.objects
FOR DELETE
TO authenticated
USING (public.can_delete_event_media(bucket_id, name));
