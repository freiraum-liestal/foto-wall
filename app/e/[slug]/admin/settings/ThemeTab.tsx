'use client';

import { Sparkles } from 'lucide-react';
import { BEAMER_THEMES } from '@/lib/theme/beamerThemes';
import type { EventRow, BeamerThemeKey } from '@/lib/supabase/types';

const THEME_FIELDS: { key: 'primary_color' | 'secondary_color' | 'bg_color' | 'text_color' | 'button_color'; label: string }[] = [
  { key: 'primary_color', label: 'Primärfarbe (Titel & Akzente)' },
  { key: 'secondary_color', label: 'Sekundärfarbe (Hinweise)' },
  { key: 'bg_color', label: 'Hintergrundfarbe' },
  { key: 'text_color', label: 'Textfarbe' },
  { key: 'button_color', label: 'Button & Highlight-Farbe' },
];

export function ThemeTab({
  event,
  setEvent,
  save,
}: {
  event: EventRow;
  setEvent: (updater: (current: EventRow) => EventRow) => void;
  save: (patch: Partial<EventRow>) => void;
}) {
  function handleThemeChange(key: 'primary_color' | 'secondary_color' | 'bg_color' | 'text_color' | 'button_color', value: string) {
    setEvent((current) => ({ ...current, theme: { ...current.theme, [key]: value } }));
  }

  function applyPreset(presetKey: BeamerThemeKey) {
    const preset = BEAMER_THEMES[presetKey];
    const newTheme = {
      ...event.theme,
      ...preset.theme,
      beamer_theme: presetKey,
    };
    setEvent((current) => ({ ...current, theme: newTheme }));
    save({ theme: newTheme });
  }

  return (
    <section className="flex flex-col gap-5 card p-4">
      {/* 1. Schnellauswahl aus Farb-Vorlagen */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
          <Sparkles size={14} className="text-neutral-500" />
          Vordefinierte Design-Paletten (1-Klick)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(Object.keys(BEAMER_THEMES) as BeamerThemeKey[]).map((key) => {
            const p = BEAMER_THEMES[key];
            const isActive = event.theme?.beamer_theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`flex flex-col gap-1.5 rounded-xl p-3 text-left border transition cursor-pointer ${
                  isActive ? 'border-neutral-900 ring-2 ring-neutral-900/10 shadow-sm' : 'border-neutral-200 hover:border-neutral-300'
                }`}
                style={{ background: p.theme.bg_color }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: p.theme.primary_color }}>
                    {p.name}
                  </span>
                  <div className="flex gap-1">
                    <span className="h-3 w-3 rounded-full" style={{ background: p.theme.primary_color }} />
                    <span className="h-3 w-3 rounded-full" style={{ background: p.theme.secondary_color }} />
                    <span className="h-3 w-3 rounded-full" style={{ background: p.theme.button_color }} />
                  </div>
                </div>
                <span className="text-[10px] opacity-75 line-clamp-1" style={{ color: p.theme.text_color }}>
                  {p.tagline}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-neutral-100" />

      {/* 2. Individuelle Farbanpassung */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-neutral-700">Individuelle Farbwerte</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEME_FIELDS.map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              {label}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={event.theme[key]}
                  onChange={(e) => handleThemeChange(key, e.target.value)}
                  onBlur={() => save({ theme: event.theme })}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-neutral-200 p-0.5"
                />
                <span className="font-mono text-[11px] text-neutral-500 uppercase">{event.theme[key]}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 3. Live-Vorschau */}
      <div>
        <p className="mb-2 text-xs font-medium text-neutral-500">Live-Vorschau Gäste-App</p>
        <ThemePreview theme={event.theme} eventName={event.name} />
      </div>
    </section>
  );
}

function ThemePreview({ theme, eventName }: { theme: EventRow['theme']; eventName: string }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-sm transition-colors"
      style={{ backgroundColor: theme.bg_color, borderColor: theme.button_color }}
    >
      <div className="p-4">
        <p className="text-sm font-semibold" style={{ color: theme.primary_color }}>
          {eventName || 'Dein Event'}
        </p>
        <p className="mt-1 text-xs" style={{ color: theme.text_color }}>
          So sehen Gäste die Farben auf Live Wall, Beamer und Onboarding.
        </p>
        <div className="mt-3 flex gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: theme.button_color }}
          >
            Beitrag absenden
          </span>
          <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ color: theme.secondary_color }}>
            Sekundärtext
          </span>
        </div>
      </div>
    </div>
  );
}
