'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ReactionBar } from './ReactionBar';
import { CommentsSection } from './CommentsSection';
import { MediaThumb } from '@/components/MediaThumb';
import { KindnessBadge } from '@/components/KindnessBadge';
import type { PostRow, ReactionEmoji } from '@/lib/supabase/types';

export function PostDetailModal({
  post,
  imageUrl,
  eventId,
  guestId,
  authorName,
  moderationEnabled,
  counts,
  mine,
  onToggleReaction,
  onClose,
}: {
  post: PostRow;
  imageUrl?: string;
  eventId: string;
  guestId: string;
  authorName: string;
  moderationEnabled: boolean;
  counts: Parameters<typeof ReactionBar>[0]['counts'];
  mine: Set<ReactionEmoji>;
  onToggleReaction: (reaction: ReactionEmoji) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.98 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <MediaThumb
          hasMedia={Boolean(post.storage_path)}
          url={imageUrl}
          alt={post.text ?? 'Beitrag'}
          mediaType={post.media_type}
          mode="player"
          className="max-h-[50vh] w-full object-contain"
        />
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{post.author_name}</p>
            <button
              onClick={onClose}
              aria-label="Schliessen"
              className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X size={18} />
            </button>
          </div>
          {post.kindness_question && <KindnessBadge text={post.kindness_question} variant="modal" />}
          {post.text && <p className="text-sm text-neutral-800">{post.text}</p>}
          <ReactionBar counts={counts} mine={mine} onToggle={onToggleReaction} />
          <hr className="border-neutral-100" />
          <CommentsSection
            eventId={eventId}
            postId={post.id}
            guestId={guestId}
            authorName={authorName}
            moderationEnabled={moderationEnabled}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
