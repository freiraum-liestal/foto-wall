-- Sicherheits-Checkliste aus supabase/README_SETUP.md, als ausführbare Tests.
-- Läuft als app_user (Nicht-Owner-Rolle) - RLS greift also wirklich.

SET ROLE app_user;

-- ------------------------------------------------------------
-- Kontext: Guest A1 (Event A)
-- ------------------------------------------------------------
SET app.current_user_id = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE cnt INT;
BEGIN
    SELECT count(*) INTO cnt FROM public.posts WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    IF cnt = 0 THEN
        RAISE NOTICE 'TEST 1 PASS: Guest A1 sieht Post aus Event B NICHT (Cross-Event-Isolation Posts)';
    ELSE
        RAISE WARNING 'TEST 1 FAIL: Guest A1 konnte Post aus Event B lesen!';
    END IF;
END $$;

DO $$
DECLARE cnt INT;
BEGIN
    SELECT count(*) INTO cnt FROM public.guests WHERE event_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    IF cnt = 0 THEN
        RAISE NOTICE 'TEST 2 PASS: Guest A1 sieht Gästeliste von Event B NICHT (Cross-Event-Isolation Guests)';
    ELSE
        RAISE WARNING 'TEST 2 FAIL: Guest A1 konnte Gäste aus Event B lesen!';
    END IF;
END $$;

DO $$
DECLARE cnt INT;
BEGIN
    SELECT count(*) INTO cnt FROM storage.objects
    WHERE name = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/dddddddd-dddd-dddd-dddd-dddddddddddd/photo.webp';
    IF cnt = 0 THEN
        RAISE NOTICE 'TEST 3 PASS: Guest A1 kann Storage-Objekt aus Event B NICHT lesen (entspricht abgelehntem createSignedUrl)';
    ELSE
        RAISE WARNING 'TEST 3 FAIL: Guest A1 konnte Storage-Objekt aus Event B lesen!';
    END IF;
END $$;

DO $$
BEGIN
    -- Versucht, mit dem eigenen Login einen Post im Namen eines FREMDEN
    -- Guests (aus dem gleichen Event) einzuschleusen und dabei direkt auf
    -- 'approved' zu setzen, obwohl moderation_enabled=true ist. Das ist
    -- exakt die Art Angriff, die die alte AND/OR-Bug-Policy erlaubt hätte.
    INSERT INTO public.posts (event_id, author_id, author_name, storage_path, status)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc', -- eigene guest-Zeile, ok
        'Guest A1',
        'fake/path.jpg',
        'approved' -- NICHT erlaubt, da moderation_enabled=true für Event A
    );
    RAISE WARNING 'TEST 4 FAIL: Direktes "approved" bei aktiver Moderation wurde nicht blockiert!';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'TEST 4 PASS: Direktes "approved" bei aktiver Moderation korrekt abgelehnt (%)', SQLERRM;
END $$;

DO $$
BEGIN
    -- Legitimer Post: eigener Guest, status='pending' -> muss klappen.
    INSERT INTO public.posts (event_id, author_id, author_name, text, status)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'Ganz normaler Testpost',
        'pending'
    );
    RAISE NOTICE 'TEST 5 PASS: Legitimer eigener Post (status=pending) wurde akzeptiert';
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TEST 5 FAIL: Legitimer Post wurde fälschlich abgelehnt (%)', SQLERRM;
END $$;

DO $$
BEGIN
    -- Blockierten Guest simulieren und erneut versuchen zu posten.
    UPDATE public.guests SET blocked = TRUE WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
END $$;

RESET ROLE; -- Blocked-Update als Superuser, dann zurück zu app_user für den Test
SET ROLE app_user;
SET app.current_user_id = '11111111-1111-1111-1111-111111111111';

DO $$
BEGIN
    INSERT INTO public.posts (event_id, author_id, author_name, text, status)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'Sollte als blockierter Gast nicht klappen',
        'pending'
    );
    RAISE WARNING 'TEST 6 FAIL: Blockierter Guest konnte trotzdem posten!';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'TEST 6 PASS: Blockierter Guest korrekt abgelehnt (%)', SQLERRM;
END $$;

-- ------------------------------------------------------------
-- Kontext: Admin von Event A - darf NICHT auf Event B zugreifen
-- ------------------------------------------------------------
RESET ROLE;
SET ROLE app_user;
SET app.current_user_id = '33333333-3333-3333-3333-333333333333';

DO $$
DECLARE cnt INT;
BEGIN
    SELECT count(*) INTO cnt FROM public.posts WHERE event_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    IF cnt = 0 THEN
        RAISE NOTICE 'TEST 7 PASS: Admin von Event A sieht Posts von Event B NICHT (Admin-Grenzen)';
    ELSE
        RAISE WARNING 'TEST 7 FAIL: Admin von Event A konnte Posts von Event B lesen!';
    END IF;
END $$;

DO $$
DECLARE cnt INT;
BEGIN
    -- Admin sieht sein eigenes Event vollständig (inkl. pending), weil
    -- die admin-Policy permissiv mit den Gast-Policies ODER-verknüpft wird.
    SELECT count(*) INTO cnt FROM public.posts WHERE event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    IF cnt >= 2 THEN
        RAISE NOTICE 'TEST 8 PASS: Admin von Event A sieht alle eigenen Posts inkl. pending (% Zeilen)', cnt;
    ELSE
        RAISE WARNING 'TEST 8 FAIL: Admin sollte mehrere Posts (inkl. pending) sehen, sah aber nur %', cnt;
    END IF;
END $$;

DO $$
DECLARE cnt INT;
BEGIN
    -- Migration 006 fix: Admin muss Storage-Objekte SEINES Events lesen können.
    SELECT count(*) INTO cnt FROM storage.objects
    WHERE name = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cccccccc-cccc-cccc-cccc-cccccccccccc/photo.webp';
    IF cnt = 1 THEN
        RAISE NOTICE 'TEST 9 PASS: Admin kann Storage-Objekt des eigenen Events lesen (Migration-006-Fix wirkt)';
    ELSE
        RAISE WARNING 'TEST 9 FAIL: Admin konnte Storage-Objekt des eigenen Events NICHT lesen - Migration 006 wirkungslos!';
    END IF;
END $$;

-- ------------------------------------------------------------
-- Kontext: kein Login (auth.uid() ist NULL) - Fail-Closed prüfen
-- ------------------------------------------------------------
RESET ROLE;
SET ROLE app_user;
RESET app.current_user_id;

DO $$
DECLARE cnt INT;
BEGIN
    SELECT count(*) INTO cnt FROM public.posts WHERE status = 'approved';
    IF cnt = 0 THEN
        RAISE NOTICE 'TEST 10 PASS: Unauthentifiziert sieht NICHTS (Fail-Closed) - % Zeilen', cnt;
    ELSE
        RAISE WARNING 'TEST 10 FAIL: Unauthentifiziert konnte % approved Posts lesen!', cnt;
    END IF;
END $$;

DO $$
DECLARE cnt INT;
BEGIN
    -- Events-Metadaten für aktive Events dürfen öffentlich sein (das ist
    -- Absicht, nicht Fail-Closed-Verletzung - die Gast-Onboarding-Seite
    -- muss ein aktives Event per Slug finden können, bevor man Gast ist).
    SELECT count(*) INTO cnt FROM public.events WHERE status = 'active';
    RAISE NOTICE 'INFO: Unauthentifiziert sieht % aktive Event(s) (gewollt, siehe events_read_active)', cnt;
END $$;

RESET ROLE;

-- ------------------------------------------------------------
-- Beleg für eine Design-Entscheidung in lib/events/admin.ts (getMyEvents):
-- Ein naives "select * from events" würde für einen eingeloggten Admin
-- NICHT nur seine eigenen Events zurückgeben, sondern auch fremde AKTIVE
-- Events (events_read_active ist absichtlich für alle offen). Deshalb
-- filtert getMyEvents() zuerst über event_admins und lädt dann gezielt
-- per .in('id', ...). Dieser Test zeigt, warum das nötig ist.
-- ------------------------------------------------------------
SET ROLE app_user;
SET app.current_user_id = '33333333-3333-3333-3333-333333333333'; -- Admin von Event A

DO $$
DECLARE cnt INT;
BEGIN
    -- Event B ist aktiv, aber Admin A verwaltet es nicht.
    SELECT count(*) INTO cnt FROM public.events WHERE status = 'active';
    IF cnt >= 2 THEN
        RAISE NOTICE 'TEST 11 INFO: Naives "select * from events" liefert % aktive Events (auch fremde!) - bestaetigt, warum getMyEvents() ueber event_admins vorfiltert', cnt;
    ELSE
        RAISE WARNING 'TEST 11 UNEXPECTED: erwartet >=2 aktive Events sichtbar, war aber %', cnt;
    END IF;
END $$;

RESET ROLE;

-- ------------------------------------------------------------
-- Migration 007: Kommentare - gleicher AND/OR-sichere Moderation-Toggle
-- wie bei Posts.
-- ------------------------------------------------------------
RESET ROLE; -- als Superuser: Guest A1 wieder entsperren (Test 6 hat blockiert)
UPDATE public.guests SET blocked = FALSE WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SET ROLE app_user;
SET app.current_user_id = '11111111-1111-1111-1111-111111111111'; -- Guest A1

DO $$
BEGIN
    -- Direktes 'approved' bei aktiver Moderation - muss scheitern.
    INSERT INTO public.comments (event_id, post_id, author_id, author_name, text, status)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'Sollte nicht direkt approved werden',
        'approved'
    );
    RAISE WARNING 'TEST 12 FAIL: Kommentar direkt approved trotz aktiver Moderation!';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'TEST 12 PASS: Kommentar korrekt auf pending beschraenkt (%)', SQLERRM;
END $$;

DO $$
BEGIN
    -- Legitimer pending-Kommentar - muss klappen.
    INSERT INTO public.comments (event_id, post_id, author_id, author_name, text, status)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'Ganz normaler Kommentar',
        'pending'
    );
    RAISE NOTICE 'TEST 13 PASS: Legitimer pending-Kommentar akzeptiert';
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TEST 13 FAIL: Legitimer Kommentar abgelehnt (%)', SQLERRM;
END $$;

RESET ROLE;

-- ------------------------------------------------------------
-- Wish Wall (Migration 008): Modul-Gating + Cross-Event-Isolation
-- ------------------------------------------------------------
RESET ROLE;
-- Modul für Event A noch NICHT aktiviert (kein event_modules-Eintrag).
SET ROLE app_user;
SET app.current_user_id = '11111111-1111-1111-1111-111111111111'; -- Guest A1

DO $$
BEGIN
    INSERT INTO public.wish_requests (event_id, author_id, author_name, text)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'Sollte scheitern, Modul ist aus'
    );
    RAISE WARNING 'TEST 14 FAIL: Wunsch trotz deaktiviertem Modul eingefuegt!';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'TEST 14 PASS: Wish-Wall-Insert ohne aktives Modul korrekt abgelehnt (%)', SQLERRM;
END $$;

-- Modul jetzt aktivieren (als Superuser, simuliert Admin-Klick).
RESET ROLE;
INSERT INTO public.event_modules (event_id, module_key, enabled)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'wish_wall', TRUE);

SET ROLE app_user;
SET app.current_user_id = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE new_id UUID;
BEGIN
    INSERT INTO public.wish_requests (event_id, author_id, author_name, text)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'Mehr Lyrical Zouk bitte'
    ) RETURNING id INTO new_id;
    RAISE NOTICE 'TEST 15 PASS: Wunsch nach Modul-Aktivierung akzeptiert (id=%)', new_id;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TEST 15 FAIL: Wunsch trotz aktivem Modul abgelehnt (%)', SQLERRM;
END $$;

DO $$
DECLARE cnt INT;
BEGIN
    -- Guest B1 (Event B) darf Wünsche aus Event A nicht sehen.
    PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
    SELECT count(*) INTO cnt FROM public.wish_requests WHERE event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    IF cnt = 0 THEN
        RAISE NOTICE 'TEST 16 PASS: Guest B1 sieht Wuensche aus Event A NICHT (Cross-Event-Isolation Wish Wall)';
    ELSE
        RAISE WARNING 'TEST 16 FAIL: Guest B1 konnte % Wuensche aus Event A lesen!', cnt;
    END IF;
END $$;

RESET ROLE;

-- ------------------------------------------------------------
-- Kindness Wall (Migration 010): Modul-Gating + Prompt-Zugehoerigkeit
-- ------------------------------------------------------------
RESET ROLE;
-- Modul fuer Event A aktivieren, Prompt anlegen.
INSERT INTO public.event_modules (event_id, module_key, enabled)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'kindness_wall', TRUE);

INSERT INTO public.kindness_prompts (id, event_id, question, active)
VALUES ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Wofuer bist du dankbar?', TRUE);

-- Zweites, INAKTIVES Prompt in Event B (fuer den Cross-Event-Test).
INSERT INTO public.kindness_prompts (id, event_id, question, active)
VALUES ('88888888-8888-8888-8888-888888888888', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Frage in Event B', TRUE);

SET ROLE app_user;
SET app.current_user_id = '11111111-1111-1111-1111-111111111111'; -- Guest A1

DO $$
BEGIN
    -- Legitime Antwort auf das eigene, aktive Prompt.
    INSERT INTO public.posts (event_id, author_id, author_name, text, status, kindness_prompt_id)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'Fuer die Musik heute',
        'pending',
        '99999999-9999-9999-9999-999999999999'
    );
    RAISE NOTICE 'TEST 17 PASS: Kindness-Antwort auf eigenes aktives Prompt akzeptiert';
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TEST 17 FAIL: Legitime Kindness-Antwort abgelehnt (%)', SQLERRM;
END $$;

DO $$
BEGIN
    -- Versuch, auf ein Prompt aus einem FREMDEN Event zu antworten.
    INSERT INTO public.posts (event_id, author_id, author_name, text, status, kindness_prompt_id)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'Sollte scheitern',
        'pending',
        '88888888-8888-8888-8888-888888888888'
    );
    RAISE WARNING 'TEST 18 FAIL: Antwort auf fremdes Event-Prompt wurde akzeptiert!';
EXCEPTION WHEN insufficient_privilege OR check_violation OR foreign_key_violation THEN
    RAISE NOTICE 'TEST 18 PASS: Antwort auf Prompt eines fremden Events korrekt abgelehnt (%)', SQLERRM;
END $$;

DO $$
DECLARE cnt INT;
BEGIN
    -- Guest B1 darf das Prompt aus Event A nicht sehen.
    PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', true);
    SELECT count(*) INTO cnt FROM public.kindness_prompts WHERE event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    IF cnt = 0 THEN
        RAISE NOTICE 'TEST 19 PASS: Guest B1 sieht Kindness-Prompt aus Event A NICHT';
    ELSE
        RAISE WARNING 'TEST 19 FAIL: Guest B1 konnte % Prompts aus Event A lesen!', cnt;
    END IF;
END $$;

RESET ROLE;

-- ------------------------------------------------------------
-- Migration 011: kindness_question wird serverseitig gesetzt, nicht
-- vom Client uebernommen.
-- ------------------------------------------------------------
RESET ROLE;
INSERT INTO public.event_modules (event_id, module_key, enabled)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'kindness_wall', TRUE)
ON CONFLICT (event_id, module_key) DO UPDATE SET enabled = TRUE;

INSERT INTO public.kindness_prompts (id, event_id, question, active)
VALUES ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Echte Frage aus der DB', TRUE)
ON CONFLICT (id) DO NOTHING;

SET ROLE app_user;
SET app.current_user_id = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE stored_question TEXT;
BEGIN
    INSERT INTO public.posts (event_id, author_id, author_name, text, status, kindness_prompt_id, kindness_question)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'Testantwort',
        'pending',
        '77777777-7777-7777-7777-777777777777',
        'GEFAELSCHTE FRAGE, die der Client mitgeschickt hat'
    )
    RETURNING kindness_question INTO stored_question;

    IF stored_question = 'Echte Frage aus der DB' THEN
        RAISE NOTICE 'TEST 20 PASS: kindness_question wurde vom Trigger korrekt ueberschrieben (Client-Wert ignoriert)';
    ELSE
        RAISE WARNING 'TEST 20 FAIL: kindness_question war "%", Client-Wert wurde uebernommen!', stored_question;
    END IF;
END $$;

RESET ROLE;

-- ------------------------------------------------------------
-- Potluck (Migration 012): Modul-Gating + Cross-Event-Isolation +
-- nur eigene Eintraege loeschbar.
-- ------------------------------------------------------------
RESET ROLE;
SET ROLE app_user;
SET app.current_user_id = '11111111-1111-1111-1111-111111111111'; -- Guest A1

DO $$
BEGIN
    INSERT INTO public.potluck_items (event_id, author_id, author_name, category, item_text)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'main',
        'Sollte scheitern, Modul ist aus'
    );
    RAISE WARNING 'TEST 21 FAIL: Potluck-Eintrag trotz deaktiviertem Modul akzeptiert!';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'TEST 21 PASS: Potluck-Insert ohne aktives Modul korrekt abgelehnt (%)', SQLERRM;
END $$;

RESET ROLE;
INSERT INTO public.event_modules (event_id, module_key, enabled)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'potluck', TRUE);

SET ROLE app_user;
SET app.current_user_id = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE new_id UUID;
BEGIN
    INSERT INTO public.potluck_items (id, event_id, author_id, author_name, category, item_text, quantity)
    VALUES (
        '66666666-6666-6666-6666-666666666666',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Guest A1',
        'dessert',
        'Schokokuchen',
        'für 12 Personen'
    ) RETURNING id INTO new_id;
    RAISE NOTICE 'TEST 22 PASS: Potluck-Eintrag nach Modul-Aktivierung akzeptiert (id=%)', new_id;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TEST 22 FAIL: Eintrag trotz aktivem Modul abgelehnt (%)', SQLERRM;
END $$;

-- Persistentes SET, gilt ab jetzt für Test 23 UND 24 (siehe Kommentar
-- unten, warum nicht set_config(..., true)).
SET app.current_user_id = '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE cnt INT;
BEGIN
    SELECT count(*) INTO cnt FROM public.potluck_items WHERE event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    IF cnt = 0 THEN
        RAISE NOTICE 'TEST 23 PASS: Guest B1 sieht Potluck-Liste aus Event A NICHT';
    ELSE
        RAISE WARNING 'TEST 23 FAIL: Guest B1 konnte % Potluck-Eintraege aus Event A lesen!', cnt;
    END IF;
END $$;

-- Wichtig: persistentes SET (nicht set_config(..., true)), sonst
-- verfaellt die Identitaet nach der einzelnen Anweisung wieder auf
-- Guest A1 - genau der Fehler, der TEST 24 beim ersten Versuch
-- verfaelscht hat (Guest A1 loeschte legitim seinen eigenen Eintrag,
-- nicht ein fremder Guest).

DO $$
BEGIN
    -- Guest B1 versucht, Guest A1's Eintrag zu loeschen - muss scheitern
    -- (0 betroffene Zeilen, kein Fehler bei DELETE mit RLS, aber Zeile
    -- muss danach noch existieren).
    DELETE FROM public.potluck_items WHERE id = '66666666-6666-6666-6666-666666666666';
END $$;

RESET ROLE; -- zurück zum Superuser für die Existenzprüfung

DO $$
DECLARE cnt INT;
BEGIN
    SELECT count(*) INTO cnt FROM public.potluck_items WHERE id = '66666666-6666-6666-6666-666666666666';
    IF cnt = 1 THEN
        RAISE NOTICE 'TEST 24 PASS: Fremder Guest konnte Eintrag NICHT loeschen (Zeile existiert noch)';
    ELSE
        RAISE WARNING 'TEST 24 FAIL: Eintrag wurde geloescht!';
    END IF;
END $$;

RESET ROLE;

-- ------------------------------------------------------------
-- Migration 013: Event-Assets (Logo) - nur Admins duerfen hochladen,
-- Gaeste explizit nicht, auch nicht in ihr eigenes Event.
-- ------------------------------------------------------------
RESET ROLE;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('event-assets', 'event-assets', TRUE, 5242880)
ON CONFLICT (id) DO NOTHING;

SET ROLE app_user;
SET app.current_user_id = '33333333-3333-3333-3333-333333333333'; -- Admin von Event A

DO $$
BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('event-assets', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/_assets/logo.png', '33333333-3333-3333-3333-333333333333');
    RAISE NOTICE 'TEST 25 PASS: Admin konnte Logo fuer eigenes Event hochladen';
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TEST 25 FAIL: Admin-Logo-Upload abgelehnt (%)', SQLERRM;
END $$;

SET app.current_user_id = '11111111-1111-1111-1111-111111111111'; -- Guest A1 (kein Admin)

DO $$
BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('event-assets', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/_assets/logo2.png', '11111111-1111-1111-1111-111111111111');
    RAISE WARNING 'TEST 26 FAIL: Normaler Gast konnte ein Event-Logo hochladen!';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'TEST 26 PASS: Gast (kein Admin) korrekt vom Logo-Upload abgehalten (%)', SQLERRM;
END $$;

RESET ROLE;
