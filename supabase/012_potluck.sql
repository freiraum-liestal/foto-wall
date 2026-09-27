-- ============================================================
-- Event-SaaS-Plattform – Migration 012
-- Potluck / Bring & Share (drittes Modul).
-- ============================================================

-- module_key-Constraint erweitern (war bisher wish_wall/kindness_wall/
-- group_chat/polls/schedule - 'potluck' fehlte, weil das Modul zum
-- Zeitpunkt von Migration 001 noch nicht geplant war).
ALTER TABLE public.event_modules DROP CONSTRAINT IF EXISTS event_modules_module_key_check;
ALTER TABLE public.event_modules ADD CONSTRAINT event_modules_module_key_check
    CHECK (module_key IN ('wish_wall', 'kindness_wall', 'group_chat', 'polls', 'schedule', 'potluck'));

CREATE TABLE IF NOT EXISTS public.potluck_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 50),
    category TEXT NOT NULL CHECK (category IN ('starter', 'main', 'dessert', 'drinks', 'other')),
    item_text TEXT NOT NULL CHECK (char_length(item_text) BETWEEN 1 AND 120),
    quantity TEXT CHECK (quantity IS NULL OR char_length(quantity) <= 50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_potluck_items_event_category
    ON public.potluck_items(event_id, category, created_at);

-- ============================================================
-- RLS – dasselbe Muster wie wish_requests
-- ============================================================
ALTER TABLE public.potluck_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "potluck_items_read_same_event" ON public.potluck_items
    FOR SELECT USING (public.is_active_guest_of(event_id));

CREATE POLICY "potluck_items_insert_own" ON public.potluck_items
    FOR INSERT WITH CHECK (
        author_id = public.guest_id_for(event_id)
        AND author_id IS NOT NULL
        AND public.is_active_guest_of(event_id)
        AND public.is_module_enabled(event_id, 'potluck')
    );

CREATE POLICY "potluck_items_delete_own" ON public.potluck_items
    FOR DELETE USING (author_id = public.guest_id_for(event_id));

CREATE POLICY "event_admins_all_potluck_items" ON public.potluck_items
    FOR ALL USING (public.is_event_admin(event_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.potluck_items;
