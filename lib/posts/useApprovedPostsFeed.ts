import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getApprovedPosts } from '@/lib/posts/api';
import { getSignedUrls, getSignedUrl } from '@/lib/media/upload';
import type { PostRow } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

export interface ApprovedPostsFeed {
  posts: PostRow[];
  urls: Record<string, string>;
  loading: boolean;
  error: string | null;
}

/**
 * Lädt approved Posts eines Events + signierte URLs und hält sie per
 * Realtime aktuell. Gemeinsam genutzt von LiveWallGrid (Gast-Ansicht)
 * und BeamerView (Projector-Ansicht) - beide brauchen exakt dieselben
 * Daten, nur unterschiedlich dargestellt.
 */
export function useApprovedPostsFeed(eventId: string, limit = 60): ApprovedPostsFeed {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const approved = await getApprovedPosts(eventId, limit);
        if (cancelled) return;
        setPosts(approved);

        const paths = approved
          .map((p) => p.storage_path)
          .filter((p): p is string => Boolean(p));
        if (paths.length > 0) {
          const signed = await getSignedUrls(paths);
          if (!cancelled) setUrls(signed);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Beiträge konnten nicht geladen werden.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, limit]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`approved-posts-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `event_id=eq.${eventId}` },
        async (payload) => {
          const row = payload.new as PostRow | undefined;
          const oldRow = payload.old as Partial<PostRow> | undefined;

          if (!row || row.status !== 'approved') {
            const id = row?.id ?? oldRow?.id;
            if (id) setPosts((current) => current.filter((p) => p.id !== id));
            return;
          }

          setPosts((current) => {
            const exists = current.some((p) => p.id === row.id);
            return exists
              ? current.map((p) => (p.id === row.id ? row : p))
              : [row, ...current];
          });

          if (row.storage_path) {
            const signed = await getSignedUrl(row.storage_path);
            if (signed) {
              const path = row.storage_path;
              setUrls((current) => ({ ...current, [path]: signed }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return { posts, urls, loading, error };
}
