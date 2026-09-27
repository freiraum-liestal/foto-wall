# Lokale RLS-Tests (ohne echtes Supabase-Projekt)

Diese Tests laufen gegen eine **lokale, einfache Postgres-Instanz** mit
minimalen Nachbauten der Supabase-Bausteine (`auth.uid()`,
`storage.foldername()` etc.). Sie prüfen die Sicherheits-Checkliste aus
`../README_SETUP.md` als echte SQL-Assertions.

**Was das abdeckt:** SQL-/RLS-Logikfehler (genau die Art Bug, die die alte
App hatte) – zuverlässig und wiederholbar bei jeder Migrationsänderung.

**Was das NICHT abdeckt:** echtes Supabase Auth (JWT-Ausstellung,
Anonymous-Sign-in), echtes Supabase Storage (Signed-URL-Erzeugung als
Service), Realtime, und den kompletten Next.js-App-Flow. Das muss am Ende
einmal gegen ein echtes Projekt verifiziert werden.

## Ausführen

Benötigt lokal installiertes Postgres (`apt install postgresql`).

```bash
sudo -u postgres createdb rls_test
sudo -u postgres psql -d rls_test -f 000_supabase_stubs.sql

# Echte Migrationen in Reihenfolge (004_realtime.sql auslassen -
# braucht eine Supabase-verwaltete Publication, nicht RLS-relevant)
for f in ../001_core_schema.sql ../002_rls_policies.sql ../003_storage_policies.sql \
         ../005_posts_moderation_and_author_name.sql ../006_storage_admin_read_fix.sql; do
  sudo -u postgres psql -d rls_test -v ON_ERROR_STOP=1 -f "$f"
done

# Grants erst NACH den Migrationen (Tabellen müssen existieren)
cat > /tmp/grants.sql <<'SQL'
GRANT USAGE ON SCHEMA public, auth, storage TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;
SQL
sudo -u postgres psql -c "CREATE ROLE app_user LOGIN PASSWORD 'test';"
sudo -u postgres psql -d rls_test -f /tmp/grants.sql

sudo -u postgres psql -d rls_test -f fixtures.sql
sudo -u postgres psql -d rls_test -f security_checklist.sql | grep -E "NOTICE|WARNING"
```

Jede Zeile im Output ist entweder `PASS` oder `FAIL` - bei jedem `FAIL`
(als `WARNING` markiert) ist etwas in den Migrationen kaputt. Bei neuen
Migrationen: neue Testfälle hier ergänzen, nicht nur auf die alten
vertrauen.

## Zuletzt ausgeführt

Alle 26 Tests bestanden gegen 14 Migrationen (Migration 014 fügt nur eine
bereichsgeprüfte Spalte hinzu, keine neue RLS-Logik - Testzahl bleibt
gleich). Ersetzt NICHT den finalen Check gegen das echte Supabase-Projekt
vor dem Oktober-Checkpoint.

**Lessons Learned beim Testen selbst:** `set_config(key, value, true)`
setzt eine Session-Variable nur LOKAL für die aktuelle Transaktion - bei
psql mit Autocommit verfällt der Wert direkt nach der einzelnen Anweisung
wieder auf den vorherigen. Für Identitätswechsel, die über mehrere
DO-Blöcke hinweg gelten sollen, immer `SET app.current_user_id = '...'`
(ohne set_config/ohne "true") verwenden. Gleiches gilt für `RESET ROLE` -
das funktioniert nur als eigenständige Anweisung, nicht innerhalb eines
DO-Blocks.

**Hinweis:** `000_supabase_stubs.sql` legt inzwischen auch `authenticated`-
und `anon`-Rollen an (Supabase stellt die live automatisch bereit) - nötig
seit Migration 009 `TO authenticated` in den Storage-Policies nutzt.

**Achtung:** `security_checklist.sql` ist NICHT wiederholbar ohne
Neuaufsetzen der Datenbank - es verändert Zustand (z.B. wird Guest A1
dauerhaft blockiert, es entstehen neue Posts). Für einen erneuten Lauf
immer zuerst `DROP DATABASE` + `CREATE DATABASE` + alle Schritte von
vorne, sonst schlagen spätere Tests fälschlich fehl (das ist mir beim
Bauen selbst passiert - Test 5 "failte" beim zweiten Lauf nur wegen
Alt-Zustand, nicht wegen eines echten Bugs).
