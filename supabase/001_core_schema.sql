-- ============================================================
-- Event-SaaS-Plattform – Core-Schema (Migration 001)
-- Multi-Tenant von Grund auf: JEDE Tabelle trägt event_id.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- events – ein Event = ein Mandant
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    event_type TEXT NOT NULL DEFAULT 'other'
        CHECK (event_type IN ('wedding', 'birthday', 'corporate', 'festival', 'other')),
    date_start DATE,
    date_end DATE,
    description TEXT,
    cover_url TEXT,
    logo_url TEXT,
    theme JSONB NOT NULL DEFAULT '{
        "primary_color": "#16302b",
        "secondary_color": "#d97b29",
        "bg_color": "#f6f4ec",
        "text_color": "#241d12",
        "button_color": "#f2b705"
    }'::jsonb,
    live_wall_mode TEXT NOT NULL DEFAULT 'grid'
        CHECK (live_wall_mode IN ('grid', 'single', 'slideshow')),
    moderation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- platform_admins – Super-Admins mit plattformweitem Zugriff
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- event_admins – wer darf welches Event verwalten
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_admins (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

-- ============================================================
-- event_modules – optionale Features pro Event (Wish Wall, Kindness Wall, Gruppenchat, ...)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_modules (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL CHECK (module_key IN ('wish_wall', 'kindness_wall', 'group_chat', 'polls', 'schedule')),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (event_id, module_key)
);

-- ============================================================
-- guests – EIN GAST PRO EVENT (nicht global!)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
    discoverable BOOLEAN NOT NULL DEFAULT TRUE,
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

-- ============================================================
-- posts – Live-Wall-Beiträge (Foto, Video oder Text)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    text TEXT CHECK (char_length(text) <= 500),
    media_type TEXT CHECK (media_type IN ('photo', 'video')),
    storage_path TEXT,
    kindness_prompt_id UUID, -- optional: FK wird in 05_modules.sql ergänzt (Modul Kindness Wall)
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    -- Mind. Text oder Media muss vorhanden sein.
    -- WICHTIG: Klammern um die OR-Bedingung! (Regression zum alten AND/OR-Bug)
    CONSTRAINT posts_has_content CHECK (text IS NOT NULL OR storage_path IS NOT NULL)
);

-- ============================================================
-- comments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 300),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- reactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL CHECK (reaction IN ('❤️', '🔥', '👏', '😍', '🕺')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, guest_id, reaction)
);

-- ============================================================
-- polls & poll_votes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 200),
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    show_on_projector BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (poll_id, guest_id)
);

-- ============================================================
-- reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN (
        'unangemessen', 'unerwuenschtes_foto', 'belaestigung', 'spam', 'anderes'
    )),
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indizes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_guests_event ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_user ON public.guests(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_event_status ON public.posts(event_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id, status);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_reports_event_status ON public.reports(event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_admins_user ON public.event_admins(user_id);

-- ============================================================
-- updated_at Trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guests_updated_at ON public.guests;
CREATE TRIGGER update_guests_updated_at
    BEFORE UPDATE ON public.guests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_polls_updated_at ON public.polls;
CREATE TRIGGER update_polls_updated_at
    BEFORE UPDATE ON public.polls
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RPC: Event + Owner atomar anlegen (löst das Henne-Ei-Problem
-- "wer darf das allererste event_admins-Insert für ein neues Event machen")
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_event_with_owner(
    p_slug TEXT,
    p_name TEXT,
    p_event_type TEXT DEFAULT 'other'
)
RETURNS public.events AS $$
DECLARE
    v_event public.events;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Nicht angemeldet.';
    END IF;

    INSERT INTO public.events (slug, name, event_type, status)
    VALUES (p_slug, p_name, p_event_type, 'draft')
    RETURNING * INTO v_event;

    INSERT INTO public.event_admins (event_id, user_id, role)
    VALUES (v_event.id, auth.uid(), 'owner');

    RETURN v_event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
