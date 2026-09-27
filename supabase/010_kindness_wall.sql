-- ============================================================
-- Event-SaaS-Plattform – Migration 010
-- Kindness Wall (zweites Modul). Antworten sind normale posts-Zeilen
-- mit gesetztem kindness_prompt_id - dieselbe Moderation, dieselbe
-- Live-Wall-Infrastruktur, nur mit eigenem Feed statt Grid.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kindness_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 200),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kindness_prompts_event_active
    ON public.kindness_prompts(event_id, active);

-- Der FK auf posts.kindness_prompt_id, der in Migration 001 bewusst
-- ausgelassen wurde, bis dieses Modul drankommt.
ALTER TABLE public.posts
    ADD CONSTRAINT posts_kindness_prompt_fk
    FOREIGN KEY (kindness_prompt_id) REFERENCES public.kindness_prompts(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_kindness_prompt ON public.posts(kindness_prompt_id);

-- ============================================================
-- RLS: kindness_prompts
-- ============================================================
ALTER TABLE public.kindness_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kindness_prompts_read_active_same_event" ON public.kindness_prompts
    FOR SELECT USING (
        active = TRUE
        AND public.is_active_guest_of(event_id)
    );

CREATE POLICY "event_admins_all_kindness_prompts" ON public.kindness_prompts
    FOR ALL USING (public.is_event_admin(event_id));

-- ============================================================
-- posts_insert_own neu: Kindness-Antworten brauchen zusätzlich ein
-- aktives Prompt DESSELBEN Events UND ein aktives Modul. Wie immer:
-- jede OR-Bedingung durchgehend geklammert.
-- ============================================================
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
        AND (
            kindness_prompt_id IS NULL
            OR (
                public.is_module_enabled(event_id, 'kindness_wall')
                AND EXISTS (
                    SELECT 1 FROM public.kindness_prompts kp
                    WHERE kp.id = kindness_prompt_id
                    AND kp.event_id = posts.event_id
                    AND kp.active = TRUE
                )
            )
        )
    );

ALTER PUBLICATION supabase_realtime ADD TABLE public.kindness_prompts;
