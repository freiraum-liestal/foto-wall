# Setup – neues Supabase-Projekt

## 1. Projekt anlegen
Ein **neues, separates** Supabase-Projekt erstellen (nicht das bestehende DTZFS-Projekt verwenden). Projekt-URL und Anon-Key notieren – diese werden später in den `.env`-Dateien der Next.js-App verwendet, nie im Klartext im Code.

## 2. Migrationen ausführen
Reihenfolge zwingend einhalten (im Supabase SQL Editor oder via `supabase db push`):

1. `001_core_schema.sql`
2. `002_rls_policies.sql`
3. `003_storage_policies.sql`
4. `004_realtime.sql`

## 3. Ersten Platform-Admin anlegen
Nach der Migration gibt es noch keinen Super-Admin. Nachdem du dich einmal reginär über Supabase Auth registriert hast (z.B. via Magic Link), führe manuell aus:

```sql
INSERT INTO public.platform_admins (user_id)
VALUES ('DEINE-USER-UUID-AUS-AUTH.USERS');
```

## 4. Erstes Test-Event anlegen
Am einfachsten über die RPC (später aus der App aufgerufen, jetzt zum Testen direkt im SQL Editor als eingeloggter User, oder über die Supabase Client Library):

```sql
SELECT public.create_event_with_owner('test-event', 'Test Event', 'other');
```

Danach `status` manuell auf `active` setzen, damit Gäste beitreten können:

```sql
UPDATE public.events SET status = 'active' WHERE slug = 'test-event';
```

---

## Manuelle Sicherheits-Checkliste (bitte vor dem Checkpoint durchspielen)

Diese Tests sollten mit zwei echten Test-Events (`event-a`, `event-b`) und je einem Test-Gast durchgeführt werden – am besten in zwei Browser-Profilen oder Inkognito-Fenstern.

- [ ] **Cross-Event-Isolation Posts:** Gast von `event-a` darf keine Posts von `event-b` sehen, auch nicht über direkte API-Calls mit bekannter `post_id`.
- [ ] **Cross-Event-Isolation Guests:** Gästeliste von `event-a` zeigt keine Gäste aus `event-b`.
- [ ] **Cross-Event-Isolation Storage:** Direkter Storage-Request auf eine Datei aus `event-b`'s Ordner mit einer `event-a`-Session muss fehlschlagen.
- [ ] **AND/OR-Regression:** Versuch, einen Post mit `author_id` einer *fremden* Person einzufügen, während gleichzeitig `storage_path` gesetzt ist → muss von RLS abgelehnt werden (das war der Bug in der alten App).
- [ ] **Blockierte Gäste:** Ein `blocked = true`-Gast darf keine neuen Posts/Kommentare erstellen, auch nicht mit gültiger Session.
- [ ] **Admin-Grenzen:** Ein Event-Admin von `event-a` darf `event-b` weder lesen noch moderieren.
- [ ] **Fail-Closed-Check:** Ein komplett unauthentifizierter Request (kein Login) darf nirgends Daten zurückbekommen ausser öffentlich zugänglichen Event-Metadaten (`status = 'active'`).

Diese Liste würde ich als festen Teil des Oktober-Checkpoints behandeln, nicht als optionalen Nice-to-have-Test.
