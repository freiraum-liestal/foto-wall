-- ============================================================
-- Event-SaaS-Plattform – Migration 014
-- Beamer-Anzeigedauer konfigurierbar (statt hart codierter 8 Sekunden).
-- Gilt für Rotation UND den Auto-Wechsel im Grid-Modus - beides ist im
-- Kern "wie lange bleibt ein Beitrag hervorgehoben", eine Einstellung
-- statt zwei separater.
-- ============================================================

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS beamer_interval_seconds INTEGER NOT NULL DEFAULT 8
    CHECK (beamer_interval_seconds BETWEEN 3 AND 60);
