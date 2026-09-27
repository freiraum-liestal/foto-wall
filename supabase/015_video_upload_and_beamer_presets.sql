-- ============================================================
-- Event-SaaS-Plattform – Migration 015 (Supabase-Verzeichnis)
-- 1. Video-Upload als eigenständiges Modul (video_upload)
-- 2. Beamer Theme & Transitions Unterstützung
-- ============================================================

-- module_key-Constraint in event_modules erweitern um 'video_upload'
ALTER TABLE public.event_modules DROP CONSTRAINT IF EXISTS event_modules_module_key_check;
ALTER TABLE public.event_modules ADD CONSTRAINT event_modules_module_key_check
    CHECK (module_key IN ('wish_wall', 'kindness_wall', 'group_chat', 'polls', 'schedule', 'potluck', 'video_upload'));
