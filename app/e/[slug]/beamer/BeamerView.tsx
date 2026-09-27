'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Maximize2, LayoutGrid, MonitorPlay, Sparkles, Sliders, ChevronRight } from 'lucide-react';
import QRCode from 'qrcode';
import { joinEventAsBeamer } from '@/lib/auth/guest';
import { BeamerRotation } from './BeamerRotation';
import { BeamerGrid } from './BeamerGrid';
import { BEAMER_THEMES, BEAMER_TRANSITIONS, getBeamerPreset } from '@/lib/theme/beamerThemes';
import type { BeamerMode, BeamerThemeKey, BeamerTransitionKey, EventTheme } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

export function BeamerView({
  eventName,
  eventSlug,
  eventId,
  logoUrl,
  beamerMode,
  intervalSeconds,
  theme,
}: {
  eventName: string;
  eventSlug: string;
  eventId: string;
  logoUrl: string | null;
  beamerMode: BeamerMode;
  intervalSeconds: number;
  theme?: EventTheme;
}) {
  const [ready, setReady] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Lokale Steuerung (Admin-Standard als Initialwert, live am Beamer anpassbar)
  const [currentThemeKey, setCurrentThemeKey] = useState<BeamerThemeKey>(
    theme?.beamer_theme ?? 'zouk'
  );
  const [currentTransitionKey, setCurrentTransitionKey] = useState<BeamerTransitionKey>(
    theme?.beamer_transition ?? 'ambient-glow'
  );
  const [currentMode, setCurrentMode] = useState<BeamerMode>(beamerMode);
  const [showControls, setShowControls] = useState(false);

  const preset = getBeamerPreset(currentThemeKey);

  useKioskMode();

  // Tastatur-Shortcuts für Beamer-Bediener (T = Theme, M = Modus, F = Fullscreen)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 't' || e.key === 'T') {
        const themes: BeamerThemeKey[] = ['zouk', 'midnight', 'modern'];
        const nextIdx = (themes.indexOf(currentThemeKey) + 1) % themes.length;
        setCurrentThemeKey(themes[nextIdx]);
      } else if (e.key === 'm' || e.key === 'M') {
        setCurrentMode((m) => (m === 'rotation' ? 'grid' : 'rotation'));
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentThemeKey]);

  useEffect(() => {
    let active = true;
    joinEventAsBeamer(eventId)
      .then(() => {
        if (active) setReady(true);
      })
      .catch((err) => {
        if (active) {
          setJoinError(getErrorMessage(err, 'Beamer konnte sich nicht anmelden.'));
        }
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  return (
    <div
      className="relative h-screen w-screen overflow-hidden select-none"
      style={{
        background: preset.visuals.bgGradient,
        color: preset.visuals.textColor,
        fontFamily: preset.visuals.fontBody,
      }}
    >
      {/* 1. Event Branding & QR-Code Overlay */}
      <BeamerBranding
        eventName={eventName}
        eventSlug={eventSlug}
        logoUrl={logoUrl}
        preset={preset}
      />

      {/* 2. Quick-Switcher / Layout Controls am Beamer */}
      <BeamerQuickControls
        preset={preset}
        currentThemeKey={currentThemeKey}
        onThemeChange={setCurrentThemeKey}
        currentTransitionKey={currentTransitionKey}
        onTransitionChange={setCurrentTransitionKey}
        currentMode={currentMode}
        onModeToggle={() => setCurrentMode((m) => (m === 'rotation' ? 'grid' : 'rotation'))}
        isOpen={showControls}
        onToggleOpen={() => setShowControls((v) => !v)}
      />

      {/* 3. Haupt-Ansicht */}
      {joinError ? (
        <FullscreenMessage preset={preset}>{joinError}</FullscreenMessage>
      ) : !ready ? (
        <FullscreenMessage preset={preset}>Verbinde mit Event-Server …</FullscreenMessage>
      ) : currentMode === 'grid' ? (
        <BeamerGrid
          eventId={eventId}
          intervalMs={intervalSeconds * 1000}
          preset={preset}
        />
      ) : (
        <BeamerRotation
          eventName={eventName}
          eventSlug={eventSlug}
          eventId={eventId}
          intervalMs={intervalSeconds * 1000}
          preset={preset}
          transitionKey={currentTransitionKey}
        />
      )}
    </div>
  );
}

/**
 * Kiosk-Komfort für einen unbeaufsichtigten Beamer:
 * - Screen Wake Lock aktiv
 * - Mauszeiger blendet sich nach 4s Inaktivität aus
 * - Doppelklick schaltet Fullscreen um
 */
function useKioskMode() {
  useEffect(() => {
    let wakeLock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };

    nav.wakeLock
      ?.request('screen')
      .then((lock) => {
        wakeLock = lock;
      })
      .catch(() => {});

    let hideTimer: ReturnType<typeof setTimeout>;
    function showCursor() {
      document.body.style.cursor = 'default';
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        document.body.style.cursor = 'none';
      }, 4000);
    }
    showCursor();
    window.addEventListener('mousemove', showCursor);

    function handleDoubleClick() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    }
    window.addEventListener('dblclick', handleDoubleClick);

    return () => {
      wakeLock?.release().catch(() => {});
      clearTimeout(hideTimer);
      document.body.style.cursor = 'default';
      window.removeEventListener('mousemove', showCursor);
      window.removeEventListener('dblclick', handleDoubleClick);
    };
  }, []);
}

function BeamerBranding({
  eventName,
  eventSlug,
  logoUrl,
  preset,
}: {
  eventName: string;
  eventSlug: string;
  logoUrl: string | null;
  preset: ReturnType<typeof getBeamerPreset>;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/e/${eventSlug}`;
    QRCode.toDataURL(url, {
      width: 180,
      margin: 1,
      color: {
        dark: preset.isDark ? '#f8fafc' : '#1c3f38',
        light: preset.isDark ? '#18181b' : '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [eventSlug, preset.isDark]);

  return (
    <>
      {/* Top Left Branding */}
      <div className="pointer-events-none absolute left-8 top-8 z-30 flex items-center gap-4">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={eventName}
            className="h-14 w-14 object-contain drop-shadow-md rounded-xl"
          />
        )}
        <div className="flex flex-col">
          <span
            className="text-xl md:text-2xl font-bold tracking-tight drop-shadow-sm"
            style={{
              color: preset.visuals.quoteColor,
              fontFamily: preset.visuals.fontHeadline === 'serif' ? 'Fraunces, Georgia, serif' : 'inherit',
            }}
          >
            {eventName}
          </span>
          <span
            className="text-xs font-semibold tracking-wider uppercase opacity-75"
            style={{ color: preset.visuals.authorColor }}
          >
            Live Beamer Wall
          </span>
        </div>
      </div>

      {/* Bottom Right QR-Code mit Mitmach-Aufruf */}
      {qrDataUrl && (
        <div
          className="pointer-events-none absolute bottom-8 right-8 z-30 flex items-center gap-4 rounded-3xl p-4 shadow-2xl backdrop-blur-xl"
          style={{
            background: preset.visuals.qrCardBg,
            border: preset.visuals.qrCardBorder,
            boxShadow: preset.visuals.cardShadow,
            color: preset.visuals.qrCardText,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR-Code zum Mitmachen"
            className="h-20 w-20 rounded-2xl shadow-inner"
          />
          <div className="flex flex-col max-w-[9.5rem]">
            <span className="text-sm font-bold leading-tight">Fotos teilen</span>
            <span className="mt-1 text-xs opacity-80 leading-snug">
              Kamera öffnen &amp; QR scannen
            </span>
            <span
              className="mt-1.5 font-mono text-[11px] font-semibold opacity-90 truncate"
              style={{ color: preset.visuals.authorColor }}
            >
              /e/{eventSlug}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Dezentes, schwebendes Steuerungsmenü direkt am Beamer:
 * Erlaubt schnelles Umschalten zwischen Themes, Transition-Stilen und Modi live vor Ort.
 */
function BeamerQuickControls({
  preset,
  currentThemeKey,
  onThemeChange,
  currentTransitionKey,
  onTransitionChange,
  currentMode,
  onModeToggle,
  isOpen,
  onToggleOpen,
}: {
  preset: ReturnType<typeof getBeamerPreset>;
  currentThemeKey: BeamerThemeKey;
  onThemeChange: (k: BeamerThemeKey) => void;
  currentTransitionKey: BeamerTransitionKey;
  onTransitionChange: (k: BeamerTransitionKey) => void;
  currentMode: BeamerMode;
  onModeToggle: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}) {
  return (
    <div className="fixed top-8 right-8 z-40 flex flex-col items-end gap-2">
      <button
        onClick={onToggleOpen}
        className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-xl transition hover:scale-105 active:scale-95 cursor-pointer"
        style={{
          background: preset.visuals.cardBg,
          border: preset.visuals.cardBorder,
          color: preset.visuals.textColor,
        }}
        title="Beamer Layout &amp; Theme Einstellungen (Taste T/M)"
      >
        <Palette size={14} style={{ color: preset.visuals.authorColor }} />
        <span>Layout: {BEAMER_THEMES[currentThemeKey].name}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            className="flex w-80 flex-col gap-4 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl"
            style={{
              background: preset.isDark ? 'rgba(18, 18, 26, 0.95)' : 'rgba(255, 255, 255, 0.96)',
              border: preset.visuals.cardBorder,
              boxShadow: preset.visuals.cardShadow,
              color: preset.visuals.textColor,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
              <div className="flex items-center gap-2">
                <Sliders size={15} style={{ color: preset.visuals.authorColor }} />
                <span className="text-xs font-bold uppercase tracking-wider">Beamer Steuerung</span>
              </div>
              <button
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen?.().catch(() => {});
                  } else {
                    document.exitFullscreen?.().catch(() => {});
                  }
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium opacity-80 hover:opacity-100 border"
                style={{ borderColor: 'rgba(128,128,128,0.2)' }}
              >
                <Maximize2 size={11} /> Vollbild (F)
              </button>
            </div>

            {/* 1. Theme Auswahl */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                Design-Layout (Taste T)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(BEAMER_THEMES) as BeamerThemeKey[]).map((key) => {
                  const t = BEAMER_THEMES[key];
                  const active = currentThemeKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => onThemeChange(key)}
                      className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center text-xs font-medium transition cursor-pointer ${
                        active ? 'ring-2 ring-offset-1' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        background: t.visuals.cardBg,
                        border: t.visuals.cardBorder,
                        color: t.visuals.textColor,
                      }}
                    >
                      <span className="text-sm">
                        {key === 'zouk' ? '✨' : key === 'midnight' ? '🌙' : '🏛️'}
                      </span>
                      <span className="text-[10px] font-bold leading-tight">{t.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Übergangs-Stil */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                Übergangs-Effekt
              </label>
              <div className="flex flex-col gap-1">
                {BEAMER_TRANSITIONS.map((trans) => {
                  const active = currentTransitionKey === trans.id;
                  return (
                    <button
                      key={trans.id}
                      onClick={() => onTransitionChange(trans.id)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition cursor-pointer ${
                        active ? 'font-bold shadow-sm' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        background: active ? preset.visuals.badgeBg : 'transparent',
                        color: active ? preset.visuals.authorColor : preset.visuals.textColor,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} />
                        <span>{trans.name}</span>
                      </div>
                      {active && <ChevronRight size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Modus: Rotation vs Grid */}
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
              <span className="text-xs font-medium">Modus: {currentMode === 'rotation' ? 'Rotation' : 'Grid'}</span>
              <button
                onClick={onModeToggle}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm cursor-pointer"
                style={{
                  background: preset.visuals.badgeBg,
                  color: preset.visuals.authorColor,
                  border: preset.visuals.cardBorder,
                }}
              >
                {currentMode === 'rotation' ? <LayoutGrid size={13} /> : <MonitorPlay size={13} />}
                <span>Zu {currentMode === 'rotation' ? 'Grid-Wand' : 'Rotation'} (M)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FullscreenMessage({
  children,
  preset,
}: {
  children: React.ReactNode;
  preset: ReturnType<typeof getBeamerPreset>;
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center text-center text-xl p-8">
      <div
        className="rounded-3xl p-8 shadow-2xl backdrop-blur-xl"
        style={{
          background: preset.visuals.cardBg,
          border: preset.visuals.cardBorder,
          color: preset.visuals.textColor,
        }}
      >
        {children}
      </div>
    </div>
  );
}
