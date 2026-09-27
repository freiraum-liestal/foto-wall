-- ============================================================
-- Event-SaaS-Plattform – Row Level Security (Migration 002)
-- PRINZIP OHNE AUSNAHME: Jede Policy prüft event_id.
-- ============================================================

-- ------------------------------------------------------------
-- Hilfsfunktionen
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_event_admin(p_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_platform_admin() OR EXISTS (
        SELECT 1 FROM public.event_admins
        WHERE event_id = p_event_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ist der aktuelle Nutzer ein NICHT blockierter Gast dieses Events?
CREATE OR REPLACE FUNCTION public.is_active_guest_of(p_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.guests
        WHERE event_id = p_event_id
        AND user_id = auth.uid()
        AND blocked = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Liefert die guests.id des aktuellen Nutzers für ein Event (oder NULL)
CREATE OR REPLACE FUNCTION public.guest_id_for(p_event_id UUID)
RETURNS UUID AS $$
    SELECT id FROM public.guests
    WHERE event_id = p_event_id AND user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- events
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Jeder kann aktive Events per Slug finden (nötig für die öffentliche Gast-Seite)
CREATE POLICY "events_read_active" ON public.events
    FOR SELECT USING (status = 'active');

-- Event-Admins sehen ihr eigenes Event unabhängig vom Status (z.B. während Draft-Setup)
CREATE POLICY "events_read_own_admin" ON public.events
    FOR SELECT USING (public.is_event_admin(id));

-- Event-Admins können ihr eigenes Event bearbeiten
CREATE POLICY "events_update_own_admin" ON public.events
    FOR UPDATE USING (public.is_event_admin(id));

-- Platform-Admins: volle Kontrolle
CREATE POLICY "platform_admins_all_events" ON public.events
    FOR ALL USING (public.is_platform_admin());

-- Hinweis: INSERT auf events läuft NICHT über eine direkte Policy,
-- sondern ausschliesslich über die RPC create_event_with_owner()
-- (SECURITY DEFINER), damit Event + Owner atomar entstehen.

-- ============================================================
-- platform_admins
-- ============================================================
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins_read_own" ON public.platform_admins
    FOR SELECT USING (public.is_platform_admin());

CREATE POLICY "platform_admins_insert" ON public.platform_admins
    FOR INSERT WITH CHECK (public.is_platform_admin());

-- ============================================================
-- event_admins
-- ============================================================
ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_admins_read_own_event" ON public.event_admins
    FOR SELECT USING (public.is_event_admin(event_id));

CREATE POLICY "event_admins_insert" ON public.event_admins
    FOR INSERT WITH CHECK (public.is_event_admin(event_id));

CREATE POLICY "event_admins_delete" ON public.event_admins
    FOR DELETE USING (public.is_event_admin(event_id));

-- ============================================================
-- event_modules
-- ============================================================
ALTER TABLE public.event_modules ENABLE ROW LEVEL SECURITY;

-- Gäste des Events dürfen sehen, welche Module aktiv sind (um UI zu rendern)
CREATE POLICY "event_modules_read_guests" ON public.event_modules
    FOR SELECT USING (
        public.is_active_guest_of(event_id) OR public.is_event_admin(event_id)
    );

CREATE POLICY "event_modules_admin_write" ON public.event_modules
    FOR ALL USING (public.is_event_admin(event_id));

-- ============================================================
-- guests
-- ============================================================
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Eigenes Profil lesen
CREATE POLICY "guests_read_own" ON public.guests
    FOR SELECT USING (user_id = auth.uid());

-- Andere sichtbare Gäste DESSELBEN Events lesen (Gästeliste/Gruppenchat)
CREATE POLICY "guests_read_discoverable_same_event" ON public.guests
    FOR SELECT USING (
        discoverable = TRUE
        AND blocked = FALSE
        AND public.is_active_guest_of(event_id)
    );

-- Eigenes Profil anlegen (Onboarding) – nur für aktive Events
CREATE POLICY "guests_insert_own" ON public.guests
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'active')
    );

-- Eigenes Profil aktualisieren (Name, Sichtbarkeit) – nicht sich selbst entsperren
CREATE POLICY "guests_update_own" ON public.guests
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Event-Admins verwalten alle Gäste ihres Events (inkl. Sperren)
CREATE POLICY "event_admins_all_guests" ON public.guests
    FOR ALL USING (public.is_event_admin(event_id));

-- ============================================================
-- posts
-- ============================================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Freigegebene Beiträge lesen NUR wenn man Gast desselben Events ist
CREATE POLICY "posts_read_approved_same_event" ON public.posts
    FOR SELECT USING (
        status = 'approved'
        AND public.is_active_guest_of(event_id)
    );

-- Eigene Beiträge lesen (auch pending/rejected)
CREATE POLICY "posts_read_own" ON public.posts
    FOR SELECT USING (
        author_id = public.guest_id_for(event_id)
    );

-- Beiträge erstellen: author_id MUSS die eigene Guest-Zeile in GENAU diesem Event sein
CREATE POLICY "posts_insert_own" ON public.posts
    FOR INSERT WITH CHECK (
        author_id = public.guest_id_for(event_id)
        AND author_id IS NOT NULL
        AND public.is_active_guest_of(event_id)
        AND status = 'pending'
        AND (text IS NOT NULL OR storage_path IS NOT NULL)
    );

-- Eigene Beiträge löschen, solange pending
CREATE POLICY "posts_delete_own" ON public.posts
    FOR DELETE USING (
        author_id = public.guest_id_for(event_id)
        AND status = 'pending'
    );

-- Event-Admins: volle Moderationskontrolle über ihr Event
CREATE POLICY "event_admins_all_posts" ON public.posts
    FOR ALL USING (public.is_event_admin(event_id));

-- ============================================================
-- comments
-- ============================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_read_approved_same_event" ON public.comments
    FOR SELECT USING (
        status = 'approved'
        AND public.is_active_guest_of(event_id)
    );

CREATE POLICY "comments_read_own" ON public.comments
    FOR SELECT USING (author_id = public.guest_id_for(event_id));

CREATE POLICY "comments_insert_own" ON public.comments
    FOR INSERT WITH CHECK (
        author_id = public.guest_id_for(event_id)
        AND author_id IS NOT NULL
        AND public.is_active_guest_of(event_id)
        AND status = 'pending'
    );

CREATE POLICY "event_admins_all_comments" ON public.comments
    FOR ALL USING (public.is_event_admin(event_id));

-- ============================================================
-- reactions
-- ============================================================
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_read_same_event" ON public.reactions
    FOR SELECT USING (public.is_active_guest_of(event_id));

CREATE POLICY "reactions_insert_own" ON public.reactions
    FOR INSERT WITH CHECK (
        guest_id = public.guest_id_for(event_id)
        AND guest_id IS NOT NULL
    );

CREATE POLICY "reactions_delete_own" ON public.reactions
    FOR DELETE USING (guest_id = public.guest_id_for(event_id));

CREATE POLICY "event_admins_all_reactions" ON public.reactions
    FOR ALL USING (public.is_event_admin(event_id));

-- ============================================================
-- polls & poll_votes
-- ============================================================
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polls_read_active_same_event" ON public.polls
    FOR SELECT USING (
        active = TRUE
        AND public.is_active_guest_of(event_id)
    );

CREATE POLICY "event_admins_all_polls" ON public.polls
    FOR ALL USING (public.is_event_admin(event_id));

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_votes_read_same_event" ON public.poll_votes
    FOR SELECT USING (public.is_active_guest_of(event_id));

CREATE POLICY "poll_votes_insert_own" ON public.poll_votes
    FOR INSERT WITH CHECK (
        guest_id = public.guest_id_for(event_id)
        AND guest_id IS NOT NULL
    );

CREATE POLICY "event_admins_all_poll_votes" ON public.poll_votes
    FOR ALL USING (public.is_event_admin(event_id));

-- ============================================================
-- reports
-- ============================================================
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_read_own" ON public.reports
    FOR SELECT USING (reporter_id = public.guest_id_for(event_id));

CREATE POLICY "reports_insert_own" ON public.reports
    FOR INSERT WITH CHECK (
        reporter_id = public.guest_id_for(event_id)
        AND reporter_id IS NOT NULL
    );

CREATE POLICY "event_admins_all_reports" ON public.reports
    FOR ALL USING (public.is_event_admin(event_id));
