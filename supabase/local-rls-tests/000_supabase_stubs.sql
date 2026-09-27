-- Minimaler Nachbau der Supabase-Bausteine, NUR für lokale RLS-Tests.
-- Kein Teil der echten Migrationen, nicht gegen das echte Projekt fahren.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Im echten Supabase liest auth.uid() aus dem JWT der Request. Hier lesen
-- wir stattdessen aus einer Session-Variable, die wir pro Testfall setzen.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT,
    public BOOLEAN,
    file_size_limit BIGINT,
    allowed_mime_types TEXT[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id TEXT REFERENCES storage.buckets(id),
    name TEXT,
    owner UUID
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] AS $$
    SELECT (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1];
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION storage.extension(name TEXT) RETURNS TEXT AS $$
    SELECT lower(substring(name FROM '\.([^.]+)$'));
$$ LANGUAGE sql IMMUTABLE;

-- Supabase stellt diese Rollen automatisch bereit; lokal müssen wir sie
-- selbst anlegen, damit "TO authenticated" in Storage-Policies greift.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
END $$;

GRANT authenticated TO app_user;

-- Supabase legt "supabase_realtime" verwaltet an; hier nur ein leerer
-- Stub, damit ALTER PUBLICATION ... ADD TABLE aus den echten Migrationen
-- (004, 008, ...) unverändert lokal laufen kann.
CREATE PUBLICATION supabase_realtime;

