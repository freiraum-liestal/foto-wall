-- ============================================================
-- Event-SaaS-Plattform – Migration 013
-- Beamer-Steuerung (an/aus, Modus) + Logo-/Cover-Upload.
-- ============================================================

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS beamer_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS beamer_mode TEXT NOT NULL DEFAULT 'rotation'
    CHECK (beamer_mode IN ('rotation', 'grid'));

-- logo_url existiert bereits seit Migration 001 (bisher ungenutzt).

-- ============================================================
-- Öffentlicher Bucket für Branding-Assets (Logo, Cover) - bewusst
-- getrennt vom privaten 'event-media'-Bucket für Gästefotos. Logos sind
-- nicht sensibel und sollen ohne Signed-URL-Aufwand überall anzeigbar
-- sein (Beamer, künftige öffentliche Event-Seite).
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'event-assets',
    'event-assets',
    TRUE,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

-- Nur Event-Admins dürfen in ihren eigenen Event-Ordner hochladen/löschen.
-- Pfadkonvention: {event_id}/_assets/{dateiname}
CREATE POLICY "admins_upload_event_assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'event-assets'
    AND split_part(name, '/', 2) = '_assets'
    AND public.is_event_admin(split_part(name, '/', 1)::uuid)
);

CREATE POLICY "admins_delete_event_assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'event-assets'
    AND public.is_event_admin(split_part(name, '/', 1)::uuid)
);

-- Lesen ist bewusst uneingeschränkt (öffentlicher Bucket).
CREATE POLICY "public_read_event_assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-assets');
