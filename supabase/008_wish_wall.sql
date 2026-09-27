-- ============================================================
-- Event-SaaS-Plattform – Migration 008
-- Wish Wall (erstes echtes Modul, testet das event_modules-Konzept
-- aus Migration 001 in der Praxis).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wish_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 50),
    text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 220),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wish_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    wish_id UUID NOT NULL REFERENCES public.wish_requests(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (wish_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_wish_requests_event ON public.wish_requests(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wish_votes_wish ON public.wish_votes(wish_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.wish_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wish_votes ENABLE ROW LEVEL SECURITY;

-- Hilfsfunktion: ist ein bestimmtes Modul für ein Event aktiv?
CREATE OR REPLACE FUNCTION public.is_module_enabled(p_event_id UUID, p_module_key TEXT)
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT enabled FROM public.event_modules
         WHERE event_id = p_event_id AND module_key = p_module_key),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "wish_requests_read_same_event" ON public.wish_requests
    FOR SELECT USING (public.is_active_guest_of(event_id));

-- Insert braucht: eigener Guest, nicht blockiert, UND das Modul muss
-- aktiv sein - Verteidigung in der Tiefe, nicht nur UI-Gating.
CREATE POLICY "wish_requests_insert_own" ON public.wish_requests
    FOR INSERT WITH CHECK (
        author_id = public.guest_id_for(event_id)
        AND author_id IS NOT NULL
        AND public.is_active_guest_of(event_id)
        AND public.is_module_enabled(event_id, 'wish_wall')
    );

CREATE POLICY "event_admins_all_wish_requests" ON public.wish_requests
    FOR ALL USING (public.is_event_admin(event_id));

CREATE POLICY "wish_votes_read_same_event" ON public.wish_votes
    FOR SELECT USING (public.is_active_guest_of(event_id));

CREATE POLICY "wish_votes_insert_own" ON public.wish_votes
    FOR INSERT WITH CHECK (
        guest_id = public.guest_id_for(event_id)
        AND guest_id IS NOT NULL
        AND public.is_module_enabled(event_id, 'wish_wall')
        AND EXISTS (
            SELECT 1 FROM public.wish_requests w
            WHERE w.id = wish_id AND w.event_id = wish_votes.event_id
        )
    );

CREATE POLICY "wish_votes_delete_own" ON public.wish_votes
    FOR DELETE USING (guest_id = public.guest_id_for(event_id));

CREATE POLICY "event_admins_all_wish_votes" ON public.wish_votes
    FOR ALL USING (public.is_event_admin(event_id));

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.wish_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wish_votes;
