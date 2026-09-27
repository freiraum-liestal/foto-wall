import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PostRow } from '@/lib/supabase/types';

export function useKindnessAnswers(eventId: string, promptId: string | null) {
  const [answers, setAnswers] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    Promise.resolve()
      .then(async () => {
        if (!promptId) return { data: [] as PostRow[], error: null };
        return supabase
          .from('posts')
          .select('*')
          .eq('event_id', eventId)
          .eq('kindness_prompt_id', promptId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });
      })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
        } else {
          setAnswers(data ?? []);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, promptId]);

  useEffect(() => {
    if (!promptId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`kindness-${promptId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `kindness_prompt_id=eq.${promptId}` },
        (payload) => {
          const row = payload.new as PostRow | undefined;
          const oldRow = payload.old as Partial<PostRow> | undefined;

          if (!row || row.status !== 'approved') {
            const id = row?.id ?? oldRow?.id;
            if (id) setAnswers((current) => current.filter((a) => a.id !== id));
            return;
          }

          setAnswers((current) =>
            current.some((a) => a.id === row.id) ? current : [row, ...current]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [promptId]);

  return { answers, loading, error };
}
