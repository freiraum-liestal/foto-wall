'use client';

import { REACTION_EMOJIS, type ReactionEmoji } from '@/lib/supabase/types';

export function ReactionBar({
  counts,
  mine,
  onToggle,
}: {
  counts: Partial<Record<ReactionEmoji, number>>;
  mine: Set<ReactionEmoji>;
  onToggle: (reaction: ReactionEmoji) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTION_EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = mine.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            className="flex items-center gap-1 rounded-full border px-2 py-1 text-sm transition-colors"
            style={{
              borderColor: active ? 'var(--event-button)' : 'var(--event-border, #e2ddc9)',
              backgroundColor: active ? 'color-mix(in srgb, var(--event-button) 15%, transparent)' : 'transparent',
            }}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs text-neutral-500">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
