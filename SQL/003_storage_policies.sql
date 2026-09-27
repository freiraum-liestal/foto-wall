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

-- ------------------------------------------------------------
-- Hilfsfunktionen mit SECURITY DEFINER
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_guest_upload_to_storage(
    p_bucket_id TEXT,
    p_object_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
    v_user_id UUID;
    v_event_id_str TEXT;
    v_guest_id_str TEXT;
BEGIN
    IF p_bucket_id <> 'event-media' THEN
        RETURN FALSE;
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_event_id_str := split_part(p_object_name, '/', 1);
    v_guest_id_str := split_part(p_object_name, '/', 2);

    IF v_event_id_str = '' OR v_guest_id_str = '' THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.guests g
        WHERE g.user_id = v_user_id
        AND g.blocked = FALSE
        AND g.event_id::text = v_event_id_str
        AND g.id::text = v_guest_id_str
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_guest_read_storage(
    p_bucket_id TEXT,
    p_object_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
    v_user_id UUID;
    v_event_id_str TEXT;
BEGIN
    IF p_bucket_id <> 'event-media' THEN
        RETURN FALSE;
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_event_id_str := split_part(p_object_name, '/', 1);
    IF v_event_id_str = '' THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.guests g
        WHERE g.user_id = v_user_id
        AND g.event_id::text = v_event_id_str
    ) OR public.is_event_admin(v_event_id_str::uuid);
END;
$$;

-- 1. Upload-Policy
CREATE POLICY "guests_upload_media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_guest_upload_to_storage(bucket_id, name)
);

-- 2. Lese-Policy
CREATE POLICY "read_own_event_media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    public.can_guest_read_storage(bucket_id, name)
);

-- 3. Lösch-Policy für Gäste
CREATE POLICY "guests_delete_own_media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    public.can_guest_upload_to_storage(bucket_id, name)
);

-- 4. Lösch-Policy für Event-Admins
CREATE POLICY "event_admins_delete_media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'event-media'
    AND public.is_event_admin((split_part(name, '/', 1))::uuid)
);
