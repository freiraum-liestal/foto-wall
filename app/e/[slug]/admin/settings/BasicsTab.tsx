'use client';

import { Upload } from 'lucide-react';
import type { EventRow } from '@/lib/supabase/types';

export function BasicsTab({
  event,
  setEvent,
  save,
  logoUploading,
  onLogoUpload,
}: {
  event: EventRow;
  setEvent: (updater: (current: EventRow) => EventRow) => void;
  save: (patch: Partial<EventRow>) => void;
  logoUploading: boolean;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <section className="flex flex-col gap-3 card p-4">
      <label className="text-xs font-medium text-neutral-600">Name</label>
      <input
        value={event.name}
        onChange={(e) => setEvent((c) => ({ ...c, name: e.target.value }))}
        onBlur={() => save({ name: event.name })}
        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
      />
      <label className="text-xs font-medium text-neutral-600">Beschreibung</label>
      <textarea
        value={event.description ?? ''}
        onChange={(e) => setEvent((c) => ({ ...c, description: e.target.value }))}
        onBlur={() => save({ description: event.description })}
        rows={2}
        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
      />
      <label className="text-xs font-medium text-neutral-600">Logo</label>
      <div className="flex items-center gap-3">
        {event.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.logo_url} alt="Logo" className="h-14 w-14 rounded-xl object-contain shadow-sm" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-neutral-300">
            <Upload size={18} />
          </div>
        )}
        <label className="cursor-pointer rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 shadow-sm hover:bg-neutral-50">
          {logoUploading ? 'Lädt hoch …' : 'Logo hochladen'}
          <input
            type="file"
            accept="image/*"
            onChange={onLogoUpload}
            disabled={logoUploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-neutral-900">Moderation aktiv</p>
          <p className="text-xs text-neutral-500">Beiträge müssen vor Veröffentlichung freigegeben werden.</p>
        </div>
        <input
          type="checkbox"
          checked={event.moderation_enabled}
          onChange={(e) => save({ moderation_enabled: e.target.checked })}
          className="h-5 w-5 flex-shrink-0"
        />
      </div>
    </section>
  );
}
