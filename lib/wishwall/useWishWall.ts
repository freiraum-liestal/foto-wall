import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getWishRequests, getWishVotes, toggleWishVote } from './api';
import type { WishRequestRow, WishVoteRow } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

export interface WishWithVotes extends WishRequestRow {
  voteCount: number;
  myVote: boolean;
}

export function useWishWall(eventId: string, guestId: string) {
  const [wishes, setWishes] = useState<WishRequestRow[]>([]);
  const [votes, setVotes] = useState<WishVoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getWishRequests(eventId), getWishVotes(eventId)])
      .then(([w, v]) => {
        if (!cancelled) {
          setWishes(w);
          setVotes(v);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Wish Wall konnte nicht geladen werden.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`wishwall-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wish_requests', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as WishRequestRow;
            setWishes((current) => (current.some((w) => w.id === row.id) ? current : [row, ...current]));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<WishRequestRow>;
            setWishes((current) => current.filter((w) => w.id !== old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wish_votes', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setVotes((current) => [...current, payload.new as WishVoteRow]);
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<WishVoteRow>;
            setVotes((current) =>
              current.filter((v) => !(v.wish_id === old.wish_id && v.guest_id === old.guest_id))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const withVotes: WishWithVotes[] = wishes
    .map((wish) => ({
      ...wish,
      voteCount: votes.filter((v) => v.wish_id === wish.id).length,
      myVote: votes.some((v) => v.wish_id === wish.id && v.guest_id === guestId),
    }))
    .sort((a, b) => b.voteCount - a.voteCount || (a.created_at < b.created_at ? 1 : -1));

  async function toggleVote(wishId: string) {
    const active = votes.some((v) => v.wish_id === wishId && v.guest_id === guestId);
    setVotes((current) =>
      active
        ? current.filter((v) => !(v.wish_id === wishId && v.guest_id === guestId))
        : [
            ...current,
            {
              id: `optimistic-${wishId}`,
              event_id: eventId,
              wish_id: wishId,
              guest_id: guestId,
              created_at: new Date().toISOString(),
            },
          ]
    );
    try {
      await toggleWishVote(eventId, wishId, guestId, active);
    } catch {
      // Realtime/erneuter Fetch korrigiert den Stand im seltenen Fehlerfall.
    }
  }

  return { wishes: withVotes, loading, error, toggleVote };
}
