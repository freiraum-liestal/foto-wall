'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getPendingComments, setCommentStatus } from '@/lib/comments/admin';
import type { CommentRow } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

export function CommentModerationQueue({ eventId }: { eventId: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getPendingComments(eventId)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(getErrorMessage(err, 'Kommentare konnten nicht geladen werden.'));
        }
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
      .channel(`comment-moderation-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as CommentRow | undefined;
          const oldRow = payload.old as Partial<CommentRow> | undefined;

          if (!row || row.status !== 'pending') {
            const id = row?.id ?? oldRow?.id;
            if (id) setComments((current) => current.filter((c) => c.id !== id));
            return;
          }

          setComments((current) => (current.some((c) => c.id === row.id) ? current : [...current, row]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function handleDecision(commentId: string, status: 'approved' | 'rejected') {
    setBusyIds((current) => new Set(current).add(commentId));
    try {
      await setCommentStatus(commentId, status);
      setComments((current) => current.filter((c) => c.id !== commentId));
      toast.success(status === 'approved' ? 'Freigegeben.' : 'Abgelehnt.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Aktion fehlgeschlagen.'));
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(commentId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
        ))}
      </div>
    );
  }
  if (comments.length === 0) {
    return <p className="p-4 text-sm text-neutral-500">Keine offenen Kommentare 🎉</p>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <AnimatePresence initial={false}>
        {comments.map((comment) => {
          const busy = busyIds.has(comment.id);
          return (
            <motion.div
              key={comment.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="card p-3"
            >
              <p className="text-sm font-medium text-neutral-900">{comment.author_name}</p>
              <p className="text-sm text-neutral-600">{comment.text}</p>
              <p className="mt-1 text-[10px] text-neutral-400">zu Beitrag #{comment.post_id.slice(0, 8)}</p>
              <div className="mt-2 flex gap-2">
                <motion.button
                  onClick={() => handleDecision(comment.id, 'approved')}
                  disabled={busy}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <Check size={13} /> Freigeben
                </motion.button>
                <motion.button
                  onClick={() => handleDecision(comment.id, 'rejected')}
                  disabled={busy}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <X size={13} /> Ablehnen
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
