-- Testdaten: zwei komplett unabhängige Events, um Isolation zu prüfen.
-- Läuft als Superuser (postgres), umgeht also selbst RLS - das ist hier
-- gewollt, wir bauen ja die Ausgangslage auf, bevor wir als app_user testen.

INSERT INTO auth.users (id) VALUES
    ('11111111-1111-1111-1111-111111111111'), -- Guest A1 (Event A)
    ('22222222-2222-2222-2222-222222222222'), -- Guest B1 (Event B)
    ('33333333-3333-3333-3333-333333333333'); -- Admin von Event A

INSERT INTO public.events (id, slug, name, status, moderation_enabled) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'event-a', 'Event A', 'active', true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'event-b', 'Event B', 'active', true);

INSERT INTO public.event_admins (event_id, user_id, role) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'owner');

INSERT INTO public.guests (id, event_id, user_id, name) VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Guest A1'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Guest B1');

INSERT INTO public.posts (id, event_id, author_id, author_name, text, status) VALUES
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Guest A1', 'Post in Event A', 'approved'),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Guest B1', 'Post in Event B', 'approved');

INSERT INTO storage.objects (bucket_id, name, owner) VALUES
    ('event-media', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/dddddddd-dddd-dddd-dddd-dddddddddddd/photo.webp', '22222222-2222-2222-2222-222222222222'),
    ('event-media', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cccccccc-cccc-cccc-cccc-cccccccccccc/photo.webp', '11111111-1111-1111-1111-111111111111');
