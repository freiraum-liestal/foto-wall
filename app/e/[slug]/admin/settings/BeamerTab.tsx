'use client';

import { motion } from 'framer-motion';
import { MonitorPlay, ExternalLink, Sparkles, Check, Palette } from 'lucide-react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { MODULE_INFO } from './moduleInfo';
import { BEAMER_THEMES, BEAMER_TRANSITIONS } from '@/lib/theme/beamerThemes';
import type { EventRow, BeamerMode, BeamerThemeKey, BeamerTransitionKey } from '@/lib/supabase/types';

export function BeamerTab({
  event,
  setEvent,
  save,
}: {
  event: EventRow;
  setEvent: (updater: (current: EventRow) => EventRow) => void;
  save: (patch: Partial<EventRow>) => void;
}) {
  const currentBeamerTheme: BeamerThemeKey = event.theme?.beamer_theme ?? 'zouk';
  const currentBeamerTransition: BeamerTransitionKey = event.theme?.beamer_transition ?? 'ambient-glow';
  const activePreset = BEAMER_THEMES[currentBeamerTheme] ?? BEAMER_THEMES.zouk;

  function handleThemeSelect(themeKey: BeamerThemeKey) {
    const updatedTheme = {
      ...event.theme,
      beamer_theme: themeKey,
    };
    setEvent((current) => ({ ...current, theme: updatedTheme }));
    save({ theme: updatedTheme });
  }

  function handleTransitionSelect(transitionKey: BeamerTransitionKey) {
    const updatedTheme = {
      ...event.theme,
      beamer_transition: transitionKey,
    };
    setEvent((current) => ({ ...current, theme: updatedTheme }));
    save({ theme: updatedTheme });
  }

  return (
    <section className="flex flex-col gap-5 card p-5">
      {/* 1. Beamer Start Button */}
      <div className="flex flex-col gap-1.5">
        <a
          href={`/e/${event.slug}/beamer`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3 px-4 text-sm font-semibold text-white shadow-md hover:bg-black transition-all"
        >
          <MonitorPlay size={17} /> Beamer-Präsentation starten <ExternalLink size={14} />
        </a>
        <p className="text-xs text-neutral-500 text-center">
          Öffnet im neuen Fenster. Am Beamer: Doppelklick für Vollbild oder Taste <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 font-mono text-[11px] border">F</kbd>.
        </p>
      </div>

      <hr className="border-neutral-100" />

      {/* 2. Beamer Aktivierung */}
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
        <input
          type="checkbox"
          checked={event.beamer_enabled}
          onChange={(e) => save({ beamer_enabled: e.target.checked })}
          className="rounded border-neutral-300"
        />
        Beamer-Ansicht für dieses Event aktiv
      </label>

      {/* 3. Beamer Layout-Themes (3 wunderschöne Presets) */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
          <Palette size={14} className="text-neutral-500" />
          Beamer Design-Layout
          <InfoTooltip text="Wähle das passende Layout für die Atmosphäre vor Ort (Warmes Festival, Dark Nightclub oder Clean Modern)." />
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(BEAMER_THEMES) as BeamerThemeKey[]).map((key) => {
            const preset = BEAMER_THEMES[key];
            const isSelected = currentBeamerTheme === key;
            return (
              <motion.button
                key={key}
                type="button"
                onClick={() => handleThemeSelect(key)}
                whileTap={{ scale: 0.98 }}
                className={`relative flex flex-col items-start gap-2.5 rounded-2xl p-4 text-left border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-neutral-900 shadow-md ring-1 ring-neutral-900/10'
                    : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50'
                }`}
              >
                {/* Farb-Miniatur & Badge */}
                <div
                  className="w-full h-16 rounded-xl relative overflow-hidden flex items-center justify-center p-2 shadow-inner"
                  style={{ background: preset.visuals.bgGradient }}
                >
                  <div
                    className="w-4/5 h-10 rounded-lg shadow-md flex items-center justify-between px-2 text-[10px] font-bold"
                    style={{
                      background: preset.visuals.cardBg,
                      border: preset.visuals.cardBorder,
                      color: preset.visuals.quoteColor,
                    }}
                  >
                    <span>{key === 'zouk' ? '✨ Standard' : key === 'midnight' ? '🌙 Dark' : '🏛️ Gallery'}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: preset.visuals.authorColor }}
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-neutral-900 flex items-center gap-1">
                    {preset.name}
                    {isSelected && <Check size={13} className="text-green-600 font-bold" />}
                  </span>
                  <span className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5 leading-snug">
                    {preset.tagline}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 4. Übergangs-Animation */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
          <Sparkles size={14} className="text-neutral-500" />
          Bildübergangs-Effekt
          <InfoTooltip text="Bestimmt, wie Fotos und Videos in der Einzelbild-Rotation wechseln." />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {BEAMER_TRANSITIONS.map((trans) => {
            const isSelected = currentBeamerTransition === trans.id;
            return (
              <button
                key={trans.id}
                type="button"
                onClick={() => handleTransitionSelect(trans.id)}
                className={`flex flex-col gap-1 rounded-xl p-3 text-left border text-xs transition cursor-pointer ${
                  isSelected
                    ? 'border-neutral-900 bg-neutral-900 text-white font-medium shadow-sm'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                }`}
              >
                <span className="font-bold flex items-center justify-between">
                  {trans.name}
                  {isSelected && <Check size={13} className="text-white" />}
                </span>
                <span className={`text-[10px] leading-tight ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  {trans.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-neutral-100" />

      {/* 5. Beamer Modus & Dauer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-neutral-600">
            Beamer-Modus <InfoTooltip text={MODULE_INFO.beamerMode} />
          </label>
          <select
            value={event.beamer_mode}
            onChange={(e) => save({ beamer_mode: e.target.value as BeamerMode })}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm"
          >
            <option value="rotation" className="text-neutral-900 bg-white">Rotation (ein Beitrag nach dem anderen)</option>
            <option value="grid" className="text-neutral-900 bg-white">Animiertes Grid (Fotowand, ein Bild hervorgehoben)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-600 flex justify-between">
            <span>Anzeigedauer pro Beitrag</span>
            <span className="font-bold text-neutral-900">{event.beamer_interval_seconds}s</span>
          </label>
          <input
            type="range"
            min={3}
            max={60}
            value={event.beamer_interval_seconds}
            onChange={(e) => setEvent((c) => ({ ...c, beamer_interval_seconds: Number(e.target.value) }))}
            onMouseUp={() => save({ beamer_interval_seconds: event.beamer_interval_seconds })}
            onTouchEnd={() => save({ beamer_interval_seconds: event.beamer_interval_seconds })}
            className="mt-2 w-full accent-neutral-900"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>3s (schnell)</span>
            <span>60s (langsam)</span>
          </div>
        </div>
      </div>

      {/* 6. Live Miniatur-Vorschau */}
      <div className="mt-1">
        <p className="text-xs font-medium text-neutral-500 mb-2">Beamer-Vorschau ({activePreset.name}):</p>
        <div
          className="relative h-44 w-full rounded-2xl overflow-hidden p-4 flex flex-col justify-between shadow-inner"
          style={{ background: activePreset.visuals.bgGradient }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold tracking-tight"
              style={{ color: activePreset.visuals.quoteColor }}
            >
              {event.name || 'Event Name'}
            </span>
            <span
              className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: activePreset.visuals.badgeBg,
                color: activePreset.visuals.authorColor,
              }}
            >
              {currentBeamerTransition}
            </span>
          </div>

          {/* Central Mock Card */}
          <div className="flex justify-center">
            <div
              className="w-48 rounded-xl p-3 text-center shadow-lg backdrop-blur-md"
              style={{
                background: activePreset.visuals.cardBg,
                border: activePreset.visuals.cardBorder,
              }}
            >
              <div className="h-14 w-full bg-neutral-200/50 rounded-lg flex items-center justify-center text-xs mb-1.5 opacity-70">
                🖼️ Foto / Video
              </div>
              <p
                className="text-[10px] font-bold truncate"
                style={{ color: activePreset.visuals.quoteColor }}
              >
                &ldquo;Tolle Stimmung! 🎉&rdquo;
              </p>
              <p
                className="text-[9px] font-medium truncate"
                style={{ color: activePreset.visuals.authorColor }}
              >
                — Sarah
              </p>
            </div>
          </div>

          {/* Progress bar mock */}
          <div className="w-full h-1 rounded-full overflow-hidden bg-black/10">
            <div
              className="h-full w-2/3 rounded-full"
              style={{ background: activePreset.visuals.progressBarColor }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
