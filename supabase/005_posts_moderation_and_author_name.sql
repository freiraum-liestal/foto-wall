-- ============================================================
-- Event-SaaS-Plattform – Migration 005
-- 1) Moderation-Toggle: wenn events.moderation_enabled = false,
--    dürfen Gäste direkt mit status='approved' posten.
-- 2) author_name wird auf posts denormalisiert (Snapshot beim Erstellen).
--    Grund: guests_read_discoverable_same_event lässt nur discoverable
--    Gäste per SELECT sichtbar sein. Ohne Denormalisierung würde der
--    Name von nicht-discoverable Autoren beim Anzeigen der Live Wall
--    für andere Gäste verschwinden (kaputter Join), obwohl der Post
--    selbst öffentlich ist. Ein Post ist eine bewusste Veröffentlichung
--    durch den Autor – das ist kein Directory-Privacy-Fall.
-- 3) approved_at/rejected_at werden automatisch per Trigger gesetzt,
--    nicht vom Client geliefert (Client-Werte wären ungeprüft).
-- ============================================================

ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.posts
    ADD CONSTRAINT posts_author_name_length
    CHECK (char_length(author_name) BETWEEN 1 AND 50);

-- ------------------------------------------------------------
-- posts_insert_own neu: Moderation-Toggle, weiterhin mit
-- durchgehend geklammerten OR-Bedingungen.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;

CREATE POLICY "posts_insert_own" ON public.posts
    FOR INSERT WITH CHECK (
        author_id = public.guest_id_for(event_id)
        AND author_id IS NOT NULL
        AND public.is_active_guest_of(event_id)
        AND (text IS NOT NULL OR storage_path IS NOT NULL)
        AND (
            status = 'pending'
            OR (
                status = 'approved'
                AND EXISTS (
                    SELECT 1 FROM public.events e
                    WHERE e.id = event_id AND e.moderation_enabled = FALSE
                )
            )
        )
    );

-- ------------------------------------------------------------
-- Timestamp-Trigger: approved_at/rejected_at automatisch setzen
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_post_moderation_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'approved') THEN
        NEW.approved_at = NOW();
    END IF;
    IF NEW.status = 'rejected' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'rejected') THEN
        NEW.rejected_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_moderation_timestamps ON public.posts;
CREATE TRIGGER posts_moderation_timestamps
    BEFORE INSERT OR UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.set_post_moderation_timestamps();
