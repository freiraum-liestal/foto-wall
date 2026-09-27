# Event-Plattform – Fundament

Next.js 16 / React 19 / TypeScript / Tailwind 4 + Supabase (`@supabase/ssr`).
Getestet: `npm run build` und `npm run lint` laufen sauber durch (mit
Platzhalter-Env-Werten, da hier keine echte Supabase-Instanz erreichbar war).

- **Kamera/Galerie-Wahl beim Upload**: Zwei getrennte Buttons ("Foto
  aufnehmen" / "Aus Galerie") statt einem gemeinsamen Dropzone-Button -
  `capture="environment"` ist nur eine Empfehlung ans Betriebssystem
  (variiert je nach iOS/Android/Browser), aber zwei separate File-Inputs
  sind der verlässlichste Weg, dem Gast die Wahl explizit zu geben.
- **Info-Tooltips für Module & Modi**: Tap-to-toggle-Popover
  (`components/InfoTooltip.tsx`) statt reinem `:hover` - Hover
  funktioniert auf Touch-Geräten nicht zuverlässig, Admins nutzen die
  Einstellungen aber durchaus auch am Handy. Texte in
  `EventSettingsForm.tsx` als `MODULE_INFO`-Konstante, leicht editierbar.

- **Wischbare mobile Live Wall** ("Einzelbild"/"Slideshow"-Modi): die
  beiden bisher deaktivierten `live_wall_mode`-Optionen sind jetzt gebaut.
  Stories-artige Ansicht (`LiveWallSwipe.tsx`) im Hochformat, ein Beitrag
  pro Bildschirm, mit dem Finger durchwischbar (Framer-Motion-Drag).
  "Slideshow" wechselt zusätzlich automatisch alle 5 Sekunden weiter
  (pausiert, sobald das Kommentar-/Reaktions-Detail offen ist). Tippen
  auf ein Bild öffnet dasselbe Detail-Modal wie im Grid - dafür wurde
  `PostDetailModal` aus `LiveWallGrid.tsx` in eine eigene Datei
  ausgelagert, damit Grid und Swipe dieselbe, bereits getestete
  Reaktions-/Kommentar-UI nutzen statt sie zu duplizieren. Betrifft nur
  die Gast-Live-Wall, nicht den Beamer (der hat sein eigenes, bereits
  konfigurierbares Rotation/Grid).

## Quick Wins aus Feedback-Runde

- **Beamer-Zugriff**: Bisher nur per manuell eingetippter URL erreichbar.
  Jetzt: Button direkt in der Admin-Navigation + eigener "Beamer starten"-
  Link im Beamer-Settings-Tab (öffnet in neuem Tab, Hinweis auf
  Doppelklick-Vollbild).
- **Moderation-Schalter verschoben**: War im "Module"-Tab versteckt,
  zwischen Live-Wall-Modus und Modul-Checkboxen. Jetzt prominent in
  "Grunddaten" (gelb hervorgehoben), da es die wichtigste
  Sicherheitseinstellung fürs Event ist.
- **Logo im Gästebereich**: Erschien bisher NUR auf dem Beamer, obwohl es
  seit dem Logo-Upload-Schritt existiert. Jetzt zusätzlich auf der
  Onboarding-Karte (gross, zentriert) und im persistenten App-Header
  (klein, neben dem Eventnamen) - genau die Lücke, die beim Testen
  aufgefallen ist.

## Bugfix: echte Fehlermeldungen statt Fallback-Text

An 26 Stellen im Code stand `err instanceof Error ? err.message : 'Fallback'`.
Je nach installierter `@supabase/*`-Version ist ein Postgrest-/Auth-/
Storage-Fehler mal eine echte `Error`-Subklasse, mal ein reines Objekt mit
`message`-Feld - abhängig vom genauen Versionsstand, den `npm install`
gerade auflöst. Der `instanceof`-Check ist dafür zu zerbrechlich: er kann
lautlos auf den Fallback-Text zurückfallen, obwohl eine aussagekräftige
Meldung (RLS-Verweigerung, Constraint-Verletzung, fehlende Funktion) da
gewesen wäre - genau das Symptom "Event konnte nicht erstellt werden"
ohne jeden Hinweis, woran es lag.

Neu: `lib/utils/errors.ts` mit `getErrorMessage(err, fallback)` - prüft
`instanceof Error`, dann ein generisches `message`-Feld, dann `String(err)`,
erst dann den Fallback. Loggt dabei IMMER das volle Fehlerobjekt in die
Konsole (Postgrest empfiehlt das explizit - `hint`/`details`/`code` sind
oft nützlicher als `message` allein). Ersetzt an allen 26 Stellen im
gesamten Code.

**Für dich relevant:** Öffne beim nächsten Fehler die Browser-Konsole
(F12 → Console) - dort steht jetzt das komplette Fehlerobjekt, auch wenn
der Toast weiterhin nur eine kurze Meldung zeigt.

## Landing Page & Code-Qualität

- **Landing Page** (`app/page.tsx`): ersetzt den Fundament-Platzhalter aus
  Schritt 3. Bewusst kein Standard-SaaS-Look (kein Creme/Terrakotta, kein
  Near-Black+Neon) - Abend-Fest-Palette (Aubergine `#2B1B2E` + Gold
  `#D4A24E`), Serif-Systemfontstack für die Schlagzeile (Georgia/Palatino-
  Familie statt Google Fonts, siehe unten), eine animierte Foto-Wand-
  Collage als einziger bewusst inszenierter Moment im Hero. Die
  "Mehr als nur Fotos"-Kachel ist bewusst breiter als die anderen drei -
  das ist tatsächlich das Alleinstellungsmerkmal, nicht nur eine von vier
  gleichrangigen Kacheln.
- **Kein next/font/google verwendet**: Meine Sandbox hat keinen
  Netzwerkzugriff auf fonts.googleapis.com (gleiche Einschränkung wie in
  Schritt 3) - ich konnte einen Web-Font-Build hier nicht verifizieren.
  Stattdessen ein waschechter Serif-Systemfontstack (Georgia/Palatino),
  der ohne Build-Zeit-Netzwerkabhängigkeit auskommt. Bei echtem
  Vercel-Deployment wäre ein Web-Font kein Problem - falls gewünscht,
  eine kleine, risikoarme Ergänzung für später.
- **Code-Konsolidierung** (Ziel: weniger Duplikation, nicht weniger
  Funktionalität - alles wurde nach jedem Schritt gegen Build/Lint
  geprüft):
  - `components/MediaThumb.tsx`: ersetzt das an 5 Stellen wortgleich
    wiederholte "Bild geladen? `<img>` : Skeleton"-Muster (LiveWallGrid,
    PostDetailModal, LiveWallSwipe, BeamerView, BeamerGrid,
    ModerationQueue).
  - `components/KindnessBadge.tsx`: ersetzt die 💛-Pille, die 4x mit
    leicht unterschiedlicher Grösse/Kontrast (hell/dunkler Hintergrund)
    dupliziert war, jetzt ein `variant`-Prop (`card`/`modal`/`beamer`/
    `swipe`).
  - `components/TabBar.tsx`: ersetzt vier separat gebaute, aber
    strukturell identische Tab-Leisten (Gast-Tabs, Moderation,
    Einstellungen, Admin-Navigation) - eine Komponente, unterstützt
    sowohl klickbare State-Tabs als auch `<a href>`-Navigation.
  - `.card`-Utility-Klasse in `globals.css`: ersetzt die an ~10 Stellen
    wortgleich wiederholte Karten-Styling-Klassenkombination.
  - **`EventSettingsForm.tsx` aufgeteilt**: von 461 auf 189 Zeilen
    (reiner Tab-Switcher), die vier Tabs sind jetzt eigene Dateien
    (`BasicsTab.tsx`, `ThemeTab.tsx`, `ModulesTab.tsx`, `BeamerTab.tsx`,
    max. 126 Zeilen), gemeinsame Info-Texte in `moduleInfo.ts`.
- **Bewusst vertagt** (grösseres Risiko, siehe Vorschlag in der
  Konversation): ein generischer `useRealtimeTable<T>()`-Hook, der die
  sieben strukturell ähnlichen Fetch+Realtime-Subscribe-Hooks
  zusammenführen würde. Betrifft die am meisten benutzten, am
  gründlichsten getesteten Stellen im Code - Realtime-Timing-Bugs zeigen
  sich oft erst live am Fest, nicht im Test. Für später, mit vollem
  Regressionstest, nicht nebenbei.

## Enthalten in diesem Schritt

- Supabase-Client-Setup für Browser, Server Components und Route Handler
- `proxy.ts` (Next 16 Nachfolger von `middleware.ts`) für Session-Refresh
- Gast-Auth: anonyme Anmeldung + Onboarding-Formular unter `/e/[slug]`
- Admin-Auth: echter Magic-Link-Login (nie anonym) unter `/e/[slug]/admin`
- Admin-Guard: **fail closed** – bei Session- oder RPC-Fehler wird der
  Zugriff verweigert, nicht gewährt (bewusster Unterschied zur alten App)
- Theme-Provider: injiziert `events.theme` als CSS-Variablen
- `/auth/callback` Route Handler für den Magic-Link-Redirect
- **Live Wall (Grid-Modus)**: echter Foto-Upload (clientseitige Optimierung,
  privater Storage-Bucket, signierte URLs), Realtime-Updates, Moderation-Toggle
  pro Event (`events.moderation_enabled`, siehe Migration 005)
- **Moderationsansicht im Admin-Panel**: pending Posts ansehen, freigeben/
  ablehnen, mit Realtime-Update (Migration 006 behebt einen Bug, bei dem
  Admins Bilder von Gästen zwar löschen, aber nicht ansehen konnten)
- **Beamer/Projector-Route** (`/e/[slug]/beamer`): rotierende Anzeige der
  approved Posts, kein Login nötig. Der Beamer tritt intern als
  nicht-discoverable Gast bei (`joinEventAsBeamer`), damit dieselben
  RLS-Regeln gelten wie für jeden anderen Zuschauer – keine Extra-Route,
  kein Service-Role-Key nötig. Nutzt das Event-Theme wie jede andere Seite
  (bewusster Unterschied zur alten App, die den Beamer fest auf Dunkel
  gepinnt hatte).
- **Lokale RLS-Testsuite** (`supabase/local-rls-tests/`): 11 echte
  SQL-Testfälle gegen eine lokale Postgres-Instanz mit nachgebauten
  Supabase-Bausteinen. Deckt SQL-/RLS-Logikfehler ab, NICHT echtes
  Supabase Auth/Storage/Realtime oder den App-Flow – das braucht am Ende
  einen Check gegen das echte Projekt.
- **Event-Customizer**: `/admin` (Magic-Link-Login, eigene Events auflisten,
  neues Event per RPC anlegen) und `/e/[slug]/admin/settings`
  (Name/Beschreibung, Theme-Farben live editierbar, Moderation-Toggle,
  Veröffentlichen-Button, QR-Code für den Gast-Link – komplett
  clientseitig generiert, kein externer QR-API-Call)
- **Downloads für Admins** (`/e/[slug]/admin/downloads`): Einzeldatei-Download
  über signierte URL, "Alle Fotos als ZIP" komplett im Browser gebaut
  (JSZip) – bewusst OHNE Service-Role-Key, siehe Kommentar in
  `lib/media/download.ts`
- **Sonner** (Toasts) und **Zod** (Eingabevalidierung) eingebaut. Zod sitzt
  an den bisherigen Vertrauensgrenzen (Gast-Name, Event-Slug/-Name,
  Theme-Hexfarben, Post-Inhalt) und ersetzt NICHT die DB-Constraints/RLS,
  sondern gibt schnelleres Feedback vor dem Request. Alle bisherigen
  Inline-Fehlermeldungen sind durch Toasts ersetzt - weniger Code pro
  Formular, konsistentes Feedback.
- **Reactions & Kommentare** auf der Live Wall: Tippen auf eine Karte öffnet
  eine Detail-Ansicht mit Emoji-Reaktionen (Toggle, optimistisches Update)
  und Kommentaren (Realtime pro geöffnetem Post). Migration 007 gibt
  Kommentaren dieselbe `author_name`-Denormalisierung und denselben
  Moderation-Toggle wie Posts.
- **Kommentar-Moderation** im Admin-Panel (`ModerationTabs.tsx`): Tabs für
  Beiträge/Kommentare, gleiches Muster wie die Post-Moderation. Die zuvor
  dokumentierte Lücke ist damit geschlossen.
- **Wish Wall** (erstes echtes Modul): Migration 008 legt `wish_requests` +
  `wish_votes` an, inkl. `is_module_enabled()`-Check direkt in der
  INSERT-Policy (Verteidigung in der Tiefe, nicht nur UI-Gating über
  `event_modules`). Admin kann das Modul in den Event-Einstellungen an-/
  ausschalten; der Wünsche-Tab erscheint bei Gästen nur, wenn aktiv.
- **Migration 009 (production-verifiziert)**: Storage-Policies aus 003/006
  nutzten rohe `EXISTS`-Subqueries gegen `public.guests` statt
  `SECURITY DEFINER`-Hilfsfunktionen wie der Rest der App - das führte im
  echten Supabase-Projekt zu `403 / new row violates row-level security
  policy` beim Foto-Upload. Migration 009 zieht dasselbe Muster nach
  (`can_guest_upload_to_storage`, `can_guest_read_storage`,
  `can_delete_event_media`), verifiziert per echtem End-to-End-Test
  (Anon-Auth → Guest-Upsert → Upload → Post-Insert, alles grün).
- **Kindness Wall** (zweites Modul): Migration 010 holt den in 001
  vorbereiteten, aber lange FK-losen `posts.kindness_prompt_id` nach,
  legt `kindness_prompts` an und erweitert `posts_insert_own` um die
  Prüfung "Prompt existiert, gehört zum selben Event, ist aktiv, Modul
  ist an". Admin setzt die aktive Frage in den Event-Einstellungen; es
  gibt immer nur eine Frage gleichzeitig.
- **Migration 011**: Kindness-Antworten erscheinen jetzt WIEDER auf der
  allgemeinen Live Wall/Beamer (nicht mehr nur im eigenen Tab) - aber mit
  einem 💛-Badge, das die zugehörige Frage zeigt. Die Frage wird dafür per
  Trigger serverseitig auf den Post geschrieben
  (`posts.kindness_question`), nicht vom Client übernommen - ein Gast
  könnte sonst eine falsche Frage mitschicken. Der eigene Kindness-Wall-
  Tab bleibt zusätzlich bestehen (fokussierte Ansicht nur der Antworten
  auf die aktuelle Frage).
- **Potluck / Bring & Share** (drittes Modul): Migration 012 legt
  `potluck_items` an (Kategorie, was, optionale Menge), erweitert den
  `module_key`-Constraint um `'potluck'`. Gäste tragen ein, was sie
  mitbringen, gruppiert nach Kategorie (Vorspeise/Hauptgang/Dessert/
  Getränke/Sonstiges); eigene Einträge sind löschbar, fremde nicht (RLS-
  geprüft, nicht nur UI-versteckt). Kein Voting wie bei Wish Wall - ist ja
  keine Abstimmung, sondern eine Zuteilung.
- **Beamer überarbeitet** (Migration 013): An/Aus-Schalter
  (`beamer_enabled`) und Modus-Feld (`beamer_mode`: `'rotation'` oder
  `'grid'`, unabhängig vom Live-Wall-Modus der Gäste). Echter Logo-Upload
  in einen **neuen, öffentlichen** Bucket (`event-assets`) - bewusst
  getrennt vom privaten Gästefoto-Bucket, weil Branding-Assets nicht
  sensibel sind und ohne Signed-URL-Umweg überall anzeigbar sein sollen.
  Beamer zeigt jetzt dauerhaft Logo + Eventname (oben links) und einen
  QR-Code zum Mitmachen (unten rechts, clientseitig generiert). Dazu
  Kiosk-Komfort für unbeaufsichtigten Langzeitbetrieb: Screen Wake Lock
  (wo unterstützt), automatisch ausblendender Mauszeiger, Vollbild per
  Doppelklick, sanfter Fade-Übergang zwischen rotierenden Beiträgen.
- **Beamer-Grid-Modus (animiert)**: `beamer_mode = 'grid'` ist jetzt
  gebaut statt Platzhalter. Mosaik aus bis zu 9 Fotos, alle 6 Sekunden
  wird automatisch ein anderes hervorgehoben (wächst auf 2×2, Rest ordnet
  sich animiert neu an) - gebaut mit Framer Motion (`layout`-Animation,
  MIT-lizenziert, kostenlos). Klick auf eine Kachel hebt sie manuell
  hervor und pausiert die Auto-Rotation für 15 Sekunden. Zeigt nur
  Beiträge mit Foto (Text-only-Posts bleiben in Rotation/Live-Wall
  sichtbar, würden hier aber als leere Kachel wirken - bewusst
  ausgeblendet). Reine Beamer-Ansicht; die Desktop-Live-Wall der Gäste
  hat weiterhin nur das einfache Grid ohne Animation - eigener Zusatz-
  Schritt, falls das auch gewünscht ist.
- **Beamer-Anzeigedauer konfigurierbar** (Migration 014):
  `beamer_interval_seconds` (3-60s, Slider in den Einstellungen) steuert
  sowohl den Rotations-Takt als auch den Auto-Wechsel im Grid-Modus - eine
  Einstellung für beide, weil es konzeptionell dieselbe Frage ist ("wie
  lange bleibt ein Beitrag im Fokus").
- **Design-Ausbau Gastansicht**: `lucide-react` (ISC-lizenziert, kostenlos
  - nicht MIT wie ich zuerst sagte, aber gleichwertig frei) ersetzt den
  nackten `<input type=file>`-Button durch eine gestaltete Dropzone mit
  Icon, Framer Motion (bereits vorhanden) für gestaffeltes Erscheinen der
  Live-Wall-Karten, Hover-/Tap-Feedback, eine animierte Unterstreichung
  für den aktiven Tab (`layoutId`-Technik) und sanfte Ein-/Ausblendungen
  beim Tab- und Modal-Wechsel. Betrifft: Onboarding, Upload, Live Wall,
- **Kommentar-Design poliert**: Avatar-Kreise mit Initialen (Farbe
  deterministisch aus dem Namen abgeleitet, nicht vom Event-Theme - sonst
  verschwimmen alle Kommentatoren in derselben Farbe), Sprechblasen-Optik,
  relative Zeitstempel ("vor 5 Min"), gestaffeltes Erscheinen neuer
  Kommentare, Skeleton-Loading, runder Send-Button mit Icon statt
  Text-Button, scrollbare Liste (max. Höhe) statt unbegrenzt wachsendem
  Modal.
- **Admin-Design-Ausbau**: Dashboard mit Kennzahlen-Karten pro Event
  (Gäste/Fotos/offene Moderationen via `lib/events/stats.ts`), Navigation
  mit Icons und animiertem aktivem Tab (gleiches `layoutId`-Muster wie
  Gastseite), Moderation mit grösseren Vorschaubildern und
  Tastaturkürzeln (A = freigeben, R = ablehnen, wirkt auf den ersten
  offenen Eintrag), Einstellungsseite in Tabs gegliedert (Grunddaten/
  Theme/Module/Beamer) mit Live-Vorschau der Theme-Farben, Downloads mit
  Fortschritts-Prozentanzeige beim ZIP-Export. Gleiche Design-Sprache wie
  die Gastseite (lucide-Icons, Framer-Motion-Übergänge, konsistente
  Radien/Schatten) - vorher wirkten Admin- und Gastbereich wie zwei
  verschiedene Produkte.

## Nebenbei gefunden und korrigiert

`globals.css` referenzierte noch `--font-geist-sans`/`--font-geist-mono`,
obwohl die Google-Fonts-Abhängigkeit in Schritt 3 bewusst durch einen
System-Font-Stack ersetzt wurde (siehe `app/layout.tsx`) - eine tote
Variable ohne Wirkung, aber unsauber. Jetzt konsistent auf denselben
System-Font-Stack gesetzt.



## Zurückgestellt für später (bewusst, um jetzt schlank zu bleiben)

- **Resend** (transaktionale E-Mails, z.B. "Event ist live"-Mail) -
  kostenloses Kontingent (100/Tag, 3'000/Monat), aber kein
  Open-Source-Selbstläufer wie Sonner/Zod - erst einbauen, wenn eine
  konkrete E-Mail gebraucht wird.
- **Recharts** (Admin-Stats-Dashboard: Fotos/Kommentare/Likes über Zeit) -
  sobald die Datenpunkte existieren, die es anzuzeigen lohnt.
- **date-fns** (Zeitzonen-sauberes Datumsformat) - relevant, sobald Events
  aus unterschiedlichen Zeitzonen kommen; aktuell reicht
  `toLocaleString('de-CH')`.

## Bugfix in diesem Schritt

`app/e/[slug]/layout.tsx` prüfte bisher `status !== 'active'` für die
gesamte `/e/[slug]`-Subtree – das hätte Event-Admins aus ihrem eigenen
Draft-Event ausgesperrt, genau während sie es einrichten. Jetzt verlässt
sich das Layout auf RLS (`events_read_own_admin` lässt Admins ihr
Draft-Event sehen, `events_read_active` sonst niemanden), und Gast-/
Beamer-Seite prüfen `status === 'active'` zusätzlich selbst, weil sie das
für ihre eigene Logik brauchen.

## Verworfener Ansatz

Für die Beamer-Route wurde testweise auch eine Service-Role-API-Route
(`/api/beamer/[slug]`) gebaut, die RLS komplett umgeht, um dem Beamer eine
Extra-Auth-Runde zu ersparen. Verworfen zugunsten der Guest-Identity-
Lösung oben, weil sie das zentrale Architekturprinzip (RLS ist die einzige
Quelle der Wahrheit, jeder Leser ist ein Guest seines Events) nicht
durchbricht – für einen so kleinen Komfortgewinn war das Service-Role-
Risiko (bypasst RLS für die GESAMTE DB, nicht nur diese Tabelle) nicht
gerechtfertigt. Falls für einen späteren Schritt (z.B. ZIP-Export) doch
Service-Role gebraucht wird, sollte das bewusst und einzeln entschieden
werden, nicht querbeet.

## Bewusst NICHT enthalten (kommt in den nächsten Schritten)

- Single-/Slideshow-Modus der Live Wall (UI-Dropdown ist vorbereitet,
  deaktiviert); Grid-Modus für den Beamer (gleiches Prinzip, gleiche
  vorbereitete/deaktivierte UI-Option)
- Video-Upload (Struktur ist vorbereitet, `media_type='video'` funktioniert
  in der DB, aber `optimizeImage` verarbeitet aktuell nur Bilder)
- Video-Download im ZIP-Export (aktuell nur Fotos, da noch kein
  Video-Upload existiert)
- Logo-/Cover-Upload im Customizer (nur Text-/Farbfelder bisher)
- Massenaktionen in der Moderation (aktuell nur einzeln freigeben/ablehnen)
- Granulare Admin-Rollen (weiterhin nur `owner`/`admin` binär)
- Vollständig typisierter Supabase-Client (`Database`-Generic) – siehe
  TODO-Kommentare in `lib/supabase/client.ts` und `server.ts`. Das lohnt
  sich erst, wenn ein echtes Supabase-Projekt existiert und
  `supabase gen types typescript` laufen kann.

## Bekannte Grenze: ZIP-Export läuft synchron im Browser

Für ein Event in der Grössenordnung von DTZFS (~100-120 Gäste) sollte das
reichen, ist aber nicht gegen sehr grosse Fotomengen getestet. Wird das
zum Problem, ist der im ursprünglichen Anforderungsdokument selbst schon
vorgesehene Ausweg ein Hintergrund-Job/Storage-Service statt der
synchronen Browser-Lösung – bewusst nicht vorzeitig gebaut, bevor klar
ist, ob es überhaupt nötig wird.

## Rückstand für spätere Module (noch nicht gebaut, bewusst vorgemerkt)

Gruppenchat wurde bewusst gestrichen (nicht benötigt) - die
`messages`-Tabelle bleibt ungenutzt im Kern-Schema liegen, falls das
später doch relevant wird.

Vereinbarte Reihenfolge für die nächsten Schritte:
1. ~~Admin-Design-Ausbau~~ - erledigt (siehe oben)
2. Video-Upload (aktuell nur Foto; Konkurrenzvergleich zeigt, dass das
   Marktstandard ist)
3. QR-Code-Signage zum Ausdrucken (druckfertiges PDF/PNG, QR-Generierung
   existiert bereits über `qrcode`)

Ausserdem als Ideen vorgemerkt, nicht terminiert: Download der
Original-Fotoqualität (aktuell wird alles auf max. 1600px WebP
komprimiert - Speicherkosten-Abwägung nötig), Einmalzahlungs-Preismodell
pro Event statt Abo.

## Zum Testen der Live Wall

Standardmässig ist `moderation_enabled = TRUE` (siehe Migration 001), d.h.
neue Posts landen als `pending` und erscheinen NICHT automatisch auf der
Wall. Für einen schnellen End-to-End-Test:

```sql
UPDATE public.events SET moderation_enabled = FALSE WHERE slug = 'test-event';
```

Dann posten Gäste direkt mit `status = 'approved'` (RLS-geprüft, siehe
Migration 005) und die Live Wall zeigt den Beitrag sofort per Realtime an.

## Setup

1. Neues Supabase-Projekt anlegen und die Migrationen aus `/supabase`
   ausführen (siehe `supabase/README_SETUP.md`).
2. `.env.local.example` nach `.env.local` kopieren, echte Werte eintragen.
3. `npm install`
4. `npm run dev`
5. Test-Event anlegen (siehe `supabase/README_SETUP.md`), dann
   `http://localhost:3000/e/<slug>` öffnen.

## Bekannte Einschränkungen dieses Standes

- Admin-Rollen sind binär (`owner`/`admin`), keine granularen Rechte.
- Kein Rate-Limiting, keine serverseitige Validierung jenseits der
  DB-Constraints/RLS – reicht für die Foundation-Phase, muss aber vor
  dem Checkpoint noch einmal bewusst geprüft werden, sobald Upload/Post
  dazukommen.
