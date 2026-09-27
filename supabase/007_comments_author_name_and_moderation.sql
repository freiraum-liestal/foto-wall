-- ============================================================
-- Event-SaaS-Plattform – Migration 007
-- Reactions & Kommentare auf der Live Wall:
-- 1) author_name auf comments denormalisiert (gleicher Grund wie bei
--    posts in Migration 005 - sonst verschwindet der Name eines
--    nicht-discoverable Kommentators beim Anzeigen für andere Gäste).
-- 2) comments_insert_own bekommt denselben Moderation-Toggle wie Posts.
-- ============================================================

ALTER TABLE public.comments
    ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.comments
    ADD CONSTRAINT comments_author_name_length
    CHECK (char_length(author_name) BETWEEN 1 AND 50);

DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;

CREATE POLICY "comments_insert_own" ON public.comments
    FOR INSERT WITH CHECK (
        author_id = public.guest_id_for(event_id)
        AND author_id IS NOT NULL
        AND public.is_active_guest_of(event_id)
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

-- Hinweis: Es gibt noch KEINE Moderationsansicht für Kommentare im
-- Admin-Panel (nur für Posts, siehe ModerationQueue.tsx). Bei aktiver
-- Moderation bleiben Kommentare also erstmal dauerhaft 'pending' und
-- unsichtbar, bis das nachgebaut wird - bewusste, dokumentierte Lücke,
-- kein Versehen.
