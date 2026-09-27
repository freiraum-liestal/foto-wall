# ZOUK:FREI LIVE → Event-SaaS-Plattform
## Architektur-Grundlagendokument v1

**Kontext:** Kommerzialisierung der bestehenden ZOUK:FREI LIVE App (Vanilla JS/HTML + Supabase) zu einer Multi-Tenant-Plattform für Event-Fotosharing (Hochzeiten, Geburtstage, Firmenanlässe, Festivals). Pilot-Event: DTZFS 2026, 20.–22. November 2026, ca. 100–120 Gäste. Vollständiger Rewrite in Next.js/React/TypeScript, DTZFS-spezifische Features werden zu optionalen Modulen.

**Go/No-Go-Checkpoint (Annahme, bitte bestätigen):** Mitte Oktober 2026 muss die neue Plattform End-to-End für ein einzelnes Event stabil laufen (Upload, Live Wall, Admin-Moderation, Realtime). Sonst: Rückfall auf die aktuelle, funktionierende App für DTZFS, Weiterentwicklung der Plattform ohne Zeitdruck.

---

## 1. Anforderungsanalyse (kurz)

**Aus der bestehenden App zu übernehmen (funktionsfähig, live-erprobtes Design):**
- Live Wall (Foto/Text-Posts, Moderationsstatus pending/approved/rejected)
- Beamer/Projector-Modus mit automatischer Rotation
- Reactions (Emoji), Kommentare
- Programm/Schedule-Anzeige
- Umfragen (Polls) mit Live-Ergebnissen
- Report/Melde-Funktion für Gäste
- Admin-Moderationspanel mit Realtime-Updates

**Als optionale Module (aktivierbar pro Event):**
- Wish Wall (Song-Requests mit Voting)
- Kindness Wall (Prompt-basierte Dankbarkeits-Posts)
- Gruppenchat / Gästeliste mit privaten Nachrichten

**Neu aus der Kommerzialisierungs-Spec:**
- Echte Multi-Event-Fähigkeit (strikte Datentrennung)
- Event-Customization (Farben, Logo, Cover, Slug/URL)
- Live-Wall-Modi: Grid / Einzelbild / Slideshow
- Video-Upload (bisher nur Foto)
- QR-Code-Generierung pro Event
- Admin-Downloads (Einzeldatei + ZIP-Export)
- Rollen: Super Admin (Plattform) / Event Admin (nur eigenes Event)
- Theme-System (zentral, nicht hart codiert)

---

## 2. Architekturübersicht

- **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime) – kein separates Backend
- **Hosting:** Vercel
- **API-Routen:** nur wo Next.js sie zwingend braucht (ZIP-Export, signierte Download-URLs, ggf. Video-Transcoding-Trigger)
- **Multi-Tenancy-Prinzip:** jede Tabelle trägt eine `event_id`, jede RLS-Policy prüft sie zwingend

```
/app
  /e/[slug]              → Event-Gastseite (Live Wall, Upload, Programm, Module)
  /e/[slug]/admin         → Event-Admin (geschützt, echter Account, nicht anonym)
  /e/[slug]/beamer        → Projector/Beamer-Ansicht
  /superadmin             → Plattform-weite Verwaltung (alle Events)
  /api/export-zip         → ZIP-Erstellung (Route Handler)
  /api/download-url       → Signierte URLs

/lib
  /supabase               → Client-Setup, typisierte Queries
  /modules                → Feature-Module: wish-wall, kindness-wall, group-chat
  /theme                  → Theme-Provider, CSS-Variablen-Injection

/components
  EventHeader, UploadButton, MediaGrid, MediaCard, MediaViewer,
  CommentSection, LikeButton, LiveWall (Grid/Single/Slideshow),
  AdminDashboard, EventCustomizer, QRCodeCard
```

---

## 3. Datenmodell (Kern)

| Tabelle | Zweck | Wichtige Felder |
|---|---|---|
| `events` | Ein Event = ein Mandant | id, slug (unique), name, event_type, date_start, date_end, description, cover_url, logo_url, theme (JSONB), live_wall_mode, status |
| `event_modules` | Welche Features sind aktiv | event_id, module_key ('wish_wall'\|'kindness_wall'\|'group_chat'), enabled, config (JSONB) |
| `event_admins` | Wer darf ein Event verwalten | event_id, user_id, role ('owner'\|'admin') |
| `guests` | Gast **pro Event** (nicht global!) | id (=auth.uid), event_id, name, discoverable, blocked |
| `media` | Fotos & Videos | id, event_id, author_id, type ('photo'\|'video'), storage_path, caption, status, created_at |
| `comments` | Kommentare zu Media | event_id, media_id, author_id, text, status |
| `reactions` | Likes/Emojis | event_id, media_id, guest_id, reaction |
| `polls` / `poll_votes` | Umfragen | event_id ergänzt |
| `reports` | Meldungen | event_id ergänzt |
| `wish_requests` | Modul Wish Wall | event_id, text, requested_by, votes |
| `kindness_prompts` / `kindness_posts` | Modul Kindness Wall | event_id |
| `messages` | Modul Gruppenchat | event_id, sender_id, recipient_id, text |

**Kritische Korrektur gegenüber der alten DB:** `guests` war bisher global (eine Zeile pro Person, `event_code` nur als loses Textfeld). Neu: `guests` ist strikt pro Event – dieselbe Person bei zwei Events hat zwei Zeilen. Das ist die Grundlage, auf der die gesamte Isolation aufbaut.

---

## 4. RLS-Policy-Design (Grundprinzip)

**Regel ohne Ausnahme:** Jede Policy prüft `event_id` – nie nur Status oder Owner allein.

Da Supabase RLS keinen impliziten "aktuellen Event-Kontext" kennt, validieren wir die Event-Zugehörigkeit über die `guests`-Tabelle:

```sql
CREATE POLICY "media_read_approved" ON public.media
FOR SELECT USING (
    status = 'approved'
    AND EXISTS (
        SELECT 1 FROM public.guests
        WHERE guests.id = auth.uid()
        AND guests.event_id = media.event_id
    )
);
```

Damit kann ein Gast von Event A grundsätzlich nichts aus Event B sehen, selbst wenn er `event_id` in einer Query erraten/manipulieren würde – die Policy blockt serverseitig.

**Explizit vermieden (Lessons Learned aus der alten App):**
- Die AND/OR-Klammerfalle aus `posts_insert_own` (`... AND text IS NOT NULL OR image_url IS NOT NULL` ohne Klammern) – jede INSERT-Policy mit OR-Bedingung wird vor dem Merge gegen einen Testfall geprüft, der versucht, sie zu umgehen.
- Fehlendes Event-Scoping (siehe oben) – zentrales Architekturprinzip, nicht Nachrüstung.
- Fail-open Admin-Checks im Client – neu: Event-Admins nutzen echte Supabase-Auth (Passwort/Magic Link), niemals anonym. Der Client zeigt nur UI-Zustände an; die RLS ist die einzige Quelle der Wahrheit für Berechtigungen.
- Storage-Policies prüfen künftig den `event_id`-Ordner-Präfix, nicht nur `guest_id` – sonst sind Bilder über Events hinweg lesbar, sobald der Bucket mehrere Events enthält.

---

## 5. Seitenstruktur & Rollen

- **Gast:** `/e/[slug]` – kein Login, Name eingeben, sofort teilnehmen (Anonymous Auth im Hintergrund)
- **Event Admin:** `/e/[slug]/admin` – echter Account, verwaltet nur eigenes Event (`event_admins`-Eintrag erforderlich)
- **Super Admin:** `/superadmin` – Plattformweite Sicht auf alle Events (Architektur dafür vorbereitet, Rolle im MVP minimal gehalten)
- **Beamer:** `/e/[slug]/beamer` – kein Login, aber Event-spezifisch über Slug

---

## 6. Wichtigste User Flows (Kurzfassung)

1. **Gast-Onboarding:** QR/Link → Event-Seite → Namenseingabe → Anonymous Auth → Guest-Zeile für `event_id` wird angelegt → Live Wall
2. **Upload:** Foto/Video wählen → optionale Caption → clientseitige Optimierung → Upload nach `event_id/guest_id/dateiname` im Storage → Insert in `media` (Status abhängig vom Event-Setting "Moderation an/aus")
3. **Admin-Setup neues Event:** Super Admin oder Self-Service → Event anlegen (Slug, Name, Datum) → Theme konfigurieren → Module aktivieren → QR-Code generieren
4. **Moderation:** Event Admin sieht pending Media nur für sein Event, genehmigt/lehnt ab, Realtime-Update an Beamer/Live Wall
5. **Download:** Admin wählt Einzeldatei (signierte URL) oder "Alle Medien" (Next.js API Route erstellt ZIP serverseitig, ggf. gestreamt bei vielen Dateien, um Vercel-Timeouts zu vermeiden)

---

## 7. Projektstruktur-Vorschlag

Monorepo nicht nötig für den MVP. Einzelnes Next.js-Projekt, klare Ordnertrennung wie unter Punkt 2. Supabase-Migrationen versioniert unter `/supabase/migrations/` (SQL-Dateien, wie bisher, aber mit `event_id` von Anfang an in jeder Tabelle).

---

## Nächste Schritte (nach deinem OK)

1. Neues Supabase-Projekt aufsetzen (getrennt vom aktuellen DTZFS-Projekt, damit die alte App als Fallback unberührt bleibt)
2. Migration 001: Core-Schema (events, event_modules, event_admins, guests, media, comments, reactions)
3. RLS-Policies gemäss Event-Scoping-Muster oben, inkl. Testfälle gegen die alten Bugs
4. Next.js-Grundgerüst: Auth-Flow (Gast vs. Admin getrennt), Theme-Provider
5. Event-Seite MVP: Live Wall (Grid-Modus) + Upload-Flow

Jeder dieser Schritte wird dir einzeln vorgeschlagen, bevor ich ihn baue.
