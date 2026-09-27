'use client';

import { InfoTooltip } from '@/components/InfoTooltip';
import { MODULE_INFO } from './moduleInfo';
import type { EventRow, LiveWallMode } from '@/lib/supabase/types';

export function ModulesTab({
  event,
  save,
  modulesLoading,
  videoUploadEnabled,
  onVideoUploadToggle,
  wishWallEnabled,
  onWishWallToggle,
  kindnessWallEnabled,
  onKindnessToggle,
  kindnessQuestion,
  onKindnessQuestionChange,
  onKindnessQuestionSave,
  kindnessSaving,
  potluckEnabled,
  onPotluckToggle,
}: {
  event: EventRow;
  save: (patch: Partial<EventRow>) => void;
  modulesLoading: boolean;
  videoUploadEnabled: boolean;
  onVideoUploadToggle: (checked: boolean) => void;
  wishWallEnabled: boolean;
  onWishWallToggle: (checked: boolean) => void;
  kindnessWallEnabled: boolean;
  onKindnessToggle: (checked: boolean) => void;
  kindnessQuestion: string;
  onKindnessQuestionChange: (value: string) => void;
  onKindnessQuestionSave: () => void;
  kindnessSaving: boolean;
  potluckEnabled: boolean;
  onPotluckToggle: (checked: boolean) => void;
}) {
  return (
    <section className="flex flex-col gap-4 card p-4 text-neutral-900">
      <div>
        <label className="text-xs font-medium text-neutral-600">
          Live-Wall-Modus <InfoTooltip text={MODULE_INFO.liveWallMode} />
        </label>
        <select
          value={event.live_wall_mode}
          onChange={(e) => save({ live_wall_mode: e.target.value as LiveWallMode })}
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm"
        >
          <option value="grid" className="text-neutral-900 bg-white">Grid</option>
          <option value="single" className="text-neutral-900 bg-white">Einzelbild (wischbar, manuell)</option>
          <option value="slideshow" className="text-neutral-900 bg-white">Slideshow (wischbar, automatisch)</option>
        </select>
      </div>

      <hr className="border-neutral-100" />

      {modulesLoading ? (
        <p className="text-xs text-neutral-400">Lade …</p>
      ) : (
        <>
          <ModuleToggle
            checked={videoUploadEnabled}
            onChange={onVideoUploadToggle}
            emoji="🎥"
            label="Video-Upload (Gäste können Videos bis 30s teilen)"
            info={MODULE_INFO.videoUpload}
          />
          <ModuleToggle
            checked={wishWallEnabled}
            onChange={onWishWallToggle}
            emoji="🎁"
            label="Wish Wall (Musikwünsche mit Voting)"
            info={MODULE_INFO.wishWall}
          />
          <ModuleToggle
            checked={kindnessWallEnabled}
            onChange={onKindnessToggle}
            emoji="💛"
            label="Kindness Wall (Frage des Tages)"
            info={MODULE_INFO.kindnessWall}
          />
          {kindnessWallEnabled && (
            <div className="ml-6 flex flex-col gap-2 border-l border-neutral-200 pl-3">
              <label className="text-xs font-medium text-neutral-600">Aktuelle Frage</label>
              <textarea
                value={kindnessQuestion}
                onChange={(e) => onKindnessQuestionChange(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="z.B. Wofür bist du heute dankbar?"
                className="rounded-xl border border-neutral-200 bg-white p-2 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
              <button
                onClick={onKindnessQuestionSave}
                disabled={kindnessSaving || !kindnessQuestion.trim()}
                className="self-start rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
              >
                {kindnessSaving ? 'Speichere …' : 'Frage setzen'}
              </button>
            </div>
          )}
          <ModuleToggle
            checked={potluckEnabled}
            onChange={onPotluckToggle}
            emoji="🍲"
            label="Ich bringe mit (Potluck / Bring & Share)"
            info={MODULE_INFO.potluck}
          />
        </>
      )}
    </section>
  );
}

function ModuleToggle({
  checked,
  onChange,
  emoji,
  label,
  info,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  emoji: string;
  label: string;
  info?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-neutral-800 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-neutral-300 accent-neutral-900"
      />
      <span className="text-neutral-900">{emoji} {label}</span>
      {info && <InfoTooltip text={info} />}
    </label>
  );
}
