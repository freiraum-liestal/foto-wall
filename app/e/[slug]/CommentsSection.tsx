'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getApprovedComments, createComment } from '@/lib/comments/api';
import { formatTimeAgo, colorFromName, initialsFromName } from '@/lib/format/text';
import type { CommentRow } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

const MAX_LENGTH = 300;

export function CommentsSection({
  eventId,
  postId,
  guestId,
  authorName,
  moderationEnabled,
}: {
  eventId: string;
  postId: string;
  guestId: string;
  authorName: string;
  moderationEnabled: boolean;
}) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getApprovedComments(postId)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const row = payload.new as CommentRow | undefined;
          if (!row || row.status !== 'approved') return;
          setComments((current) => (current.some((c) => c.id === row.id) ? current : [...current, row]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [comments.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const comment = await createComment({
        eventId,
        postId,
        guestId,
        authorName,
        text,
        moderationEnabled,
      });
      setText('');
      if (!moderationEnabled) {
        setComments((current) => [...current, comment]);
      } else {
        toast.success('Kommentar gesendet – wartet auf Freigabe.');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Kommentar konnte nicht gesendet werden.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
        <MessageCircle size={14} />
        {comments.length > 0 ? `${comments.length} Kommentar${comments.length === 1 ? '' : 'e'}` : 'Kommentare'}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="h-7 w-7 flex-shrink-0 animate-pulse rounded-full bg-neutral-100" />
              <div className="h-10 flex-1 animate-pulse rounded-2xl bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-neutral-400">Noch keine Kommentare – sei die/der Erste.</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <motion.li
                key={comment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2"
              >
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: colorFromName(comment.author_name) }}
                >
                  {initialsFromName(comment.author_name)}
                </div>
                <div className="flex-1 rounded-2xl rounded-tl-sm bg-neutral-100 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-neutral-700">{comment.author_name}</span>
                    <span className="whitespace-nowrap text-[10px] text-neutral-400">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-800">{comment.text}</p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          <div ref={listEndRef} />
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Kommentieren …"
            className="w-full rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--event-button)' } as React.CSSProperties}
          />
        </div>
        <motion.button
          type="submit"
          disabled={sending || !text.trim()}
          whileTap={{ scale: 0.92 }}
          aria-label="Kommentar senden"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white shadow-sm disabled:opacity-40"
          style={{ backgroundColor: 'var(--event-button)' }}
        >
          <Send size={15} />
        </motion.button>
      </form>
    </div>
  );
}
