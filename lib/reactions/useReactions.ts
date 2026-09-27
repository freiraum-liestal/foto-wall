import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getReactionsForPosts, toggleReaction } from './api';
import type { ReactionRow, ReactionEmoji } from '@/lib/supabase/types';

export interface ReactionsState {
  countsByPost: Record<string, Partial<Record<ReactionEmoji, number>>>;
  mineByPost: Record<string, Set<ReactionEmoji>>;
  toggle: (postId: string, reaction: ReactionEmoji) => Promise<void>;
}

function aggregate(
  rows: ReactionRow[],
  guestId: string
): { counts: ReactionsState['countsByPost']; mine: ReactionsState['mineByPost'] } {
  const counts: ReactionsState['countsByPost'] = {};
  const mine: ReactionsState['mineByPost'] = {};

  for (const row of rows) {
    counts[row.post_id] ??= {};
    counts[row.post_id][row.reaction] = (counts[row.post_id][row.reaction] ?? 0) + 1;

    if (row.guest_id === guestId) {
      mine[row.post_id] ??= new Set();
      mine[row.post_id].add(row.reaction);
    }
  }
  return { counts, mine };
}

export function useReactions(eventId: string, postIds: string[], guestId: string): ReactionsState {
  const [rows, setRows] = useState<ReactionRow[]>([]);
  const idsKey = postIds.slice().sort().join(',');

  useEffect(() => {
    let cancelled = false;
    const ids = idsKey ? idsKey.split(',') : [];

    Promise.resolve()
      .then(() => (ids.length === 0 ? [] : getReactionsForPosts(ids)))
      .then((data) => {
        if (!cancelled) setRows(data);
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`reactions-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRows((current) => [...current, payload.new as ReactionRow]);
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<ReactionRow>;
            setRows((current) =>
              current.filter(
                (r) =>
                  !(
                    r.post_id === old.post_id &&
                    r.guest_id === old.guest_id &&
                    r.reaction === old.reaction
                  )
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const { counts, mine } = aggregate(rows, guestId);

  async function toggle(postId: string, reaction: ReactionEmoji) {
    const active = mine[postId]?.has(reaction) ?? false;
    // Optimistisches Update, damit sich Tippen nicht verzögert anfühlt.
    setRows((current) =>
      active
        ? current.filter(
            (r) => !(r.post_id === postId && r.guest_id === guestId && r.reaction === reaction)
          )
        : [
            ...current,
            {
              id: `optimistic-${postId}-${reaction}`,
              event_id: eventId,
              post_id: postId,
              guest_id: guestId,
              reaction,
              created_at: new Date().toISOString(),
            },
          ]
    );
    try {
      await toggleReaction(eventId, postId, guestId, reaction, active);
    } catch {
      // Bei Fehler: Realtime/nächster Fetch bringt den korrekten Stand
      // zurück; kein Extra-Rollback-Code für diesen seltenen Fall.
    }
  }

  return { countsByPost: counts, mineByPost: mine, toggle };
}
