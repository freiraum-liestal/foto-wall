-- ============================================================
-- Event-SaaS-Plattform – Realtime (Migration 004)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;

-- Hinweis: In der Supabase-Konsole unter Database → Replication
-- müssen diese Tabellen zusätzlich für Realtime aktiviert werden.
-- Beachte: RLS gilt auch für Realtime-Payloads – ein Client bekommt
-- nur Change-Events für Zeilen, die er laut Policy auch lesen dürfte.
