import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getPotluckItems } from './api';
import type { PotluckItemRow } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

export function usePotluckItems(eventId: string) {
  const [items, setItems] = useState<PotluckItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPotluckItems(eventId)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Liste konnte nicht geladen werden.'));
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
      .channel(`potluck-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'potluck_items', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as PotluckItemRow;
            setItems((current) => (current.some((i) => i.id === row.id) ? current : [...current, row]));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<PotluckItemRow>;
            setItems((current) => current.filter((i) => i.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return { items, loading, error };
}
