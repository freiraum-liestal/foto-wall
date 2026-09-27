'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getPendingPosts, setPostStatus } from '@/lib/posts/admin';
import { getSignedUrls, getSignedUrl } from '@/lib/media/upload';
import { MediaThumb } from '@/components/MediaThumb';
import type { PostRow } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

export function ModerationQueue({ eventId }: { eventId: string }) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const pending = await getPendingPosts(eventId);
        if (cancelled) return;
        setPosts(pending);

        const paths = pending
          .map((p) => p.storage_path)
          .filter((p): p is string => Boolean(p));
        if (paths.length > 0) {
          const signed = await getSignedUrls(paths);
          if (!cancelled) setUrls(signed);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(getErrorMessage(err, 'Moderationsliste konnte nicht geladen werden.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`moderation-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `event_id=eq.${eventId}` },
        async (payload) => {
          const row = payload.new as PostRow | undefined;
          const oldRow = payload.old as Partial<PostRow> | undefined;

          if (!row || row.status !== 'pending') {
            const id = row?.id ?? oldRow?.id;
            if (id) setPosts((current) => current.filter((p) => p.id !== id));
            return;
          }

          setPosts((current) => {
            const exists = current.some((p) => p.id === row.id);
            return exists ? current : [...current, row];
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

  async function handleDecision(postId: string, status: 'approved' | 'rejected') {
    setBusyIds((current) => new Set(current).add(postId));
    try {
      await setPostStatus(postId, status);
      setPosts((current) => current.filter((p) => p.id !== postId));
      toast.success(status === 'approved' ? 'Freigegeben.' : 'Abgelehnt.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Aktion fehlgeschlagen.'));
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(postId);
        return next;
      });
    }
  }

  // Tastaturkürzel wirken auf den ERSTEN offenen Beitrag - der natürliche
  // "als nächstes dran"-Fall bei zügigem Durchmoderieren während des Fests.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (posts.length === 0) return;
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      const firstId = posts[0].id;
      if (e.key.toLowerCase() === 'a') handleDecision(firstId, 'approved');
      if (e.key.toLowerCase() === 'r') handleDecision(firstId, 'rejected');
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [posts]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return <p className="p-4 text-sm text-neutral-500">Keine offenen Beiträge 🎉</p>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-xs text-neutral-400">
        {posts.length} offen · Tastenkürzel: <kbd className="rounded bg-neutral-100 px-1">A</kbd> freigeben,{' '}
        <kbd className="rounded bg-neutral-100 px-1">R</kbd> ablehnen (erster Eintrag)
      </p>
      <AnimatePresence initial={false}>
        {posts.map((post) => {
          const busy = busyIds.has(post.id);
          return (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 card p-3"
            >
              <MediaThumb
                hasMedia={Boolean(post.storage_path)}
                url={post.storage_path ? urls[post.storage_path] : undefined}
                alt={post.text ?? 'Beitrag'}
                mediaType={post.media_type}
                mode="inline-preview"
                className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
                skeletonClassName="h-24 w-24 flex-shrink-0 rounded-xl bg-neutral-100"
              />
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{post.author_name}</p>
                  {post.text && <p className="text-sm text-neutral-600">{post.text}</p>}
                </div>
                <div className="flex gap-2 pt-2">
                  <motion.button
                    onClick={() => handleDecision(post.id, 'approved')}
                    disabled={busy}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <Check size={13} /> Freigeben
                  </motion.button>
                  <motion.button
                    onClick={() => handleDecision(post.id, 'rejected')}
                    disabled={busy}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <X size={13} /> Ablehnen
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
