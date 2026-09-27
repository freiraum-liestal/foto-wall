'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useApprovedPostsFeed } from '@/lib/posts/useApprovedPostsFeed';
import { useReactions } from '@/lib/reactions/useReactions';
import { PostDetailModal } from './PostDetailModal';
import { MediaThumb } from '@/components/MediaThumb';
import { KindnessBadge } from '@/components/KindnessBadge';
import type { PostRow } from '@/lib/supabase/types';

export function LiveWallGrid({
  eventId,
  guestId,
  authorName,
  moderationEnabled,
}: {
  eventId: string;
  guestId: string;
  authorName: string;
  moderationEnabled: boolean;
}) {
  const { posts, urls, loading, error } = useApprovedPostsFeed(eventId);
  const reactions = useReactions(
    eventId,
    posts.map((p) => p.id),
    guestId
  );
  const [openPost, setOpenPost] = useState<PostRow | null>(null);

  if (loading) return <p className="p-4 text-sm text-neutral-400">Lade Live Wall …</p>;
  if (error) return <p className="p-4 text-sm text-red-600">{error}</p>;
  if (posts.length === 0) {
    return (
      <p className="p-4 text-sm text-neutral-500">
        Noch keine Beiträge. Sei der/die Erste! 📸
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            index={index}
            imageUrl={post.storage_path ? urls[post.storage_path] : undefined}
            reactionCount={Object.values(reactions.countsByPost[post.id] ?? {}).reduce(
              (sum, n) => sum + (n ?? 0),
              0
            )}
            onOpen={() => setOpenPost(post)}
          />
        ))}
      </div>

      <AnimatePresence>
        {openPost && (
          <PostDetailModal
            post={openPost}
            imageUrl={openPost.storage_path ? urls[openPost.storage_path] : undefined}
            eventId={eventId}
            guestId={guestId}
            authorName={authorName}
            moderationEnabled={moderationEnabled}
            counts={reactions.countsByPost[openPost.id] ?? {}}
            mine={reactions.mineByPost[openPost.id] ?? new Set()}
            onToggleReaction={(reaction) => reactions.toggle(openPost.id, reaction)}
            onClose={() => setOpenPost(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function PostCard({
  post,
  index,
  imageUrl,
  reactionCount,
  onOpen,
}: {
  post: PostRow;
  index: number;
  imageUrl?: string;
  reactionCount: number;
  onOpen: () => void;
}) {
  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex aspect-square flex-col overflow-hidden rounded-xl bg-white text-left shadow-sm"
    >
      <MediaThumb
        hasMedia={Boolean(post.storage_path)}
        url={imageUrl}
        alt={post.text ?? 'Beitrag'}
        mediaType={post.media_type}
        mode="thumbnail"
        className="h-2/3 w-full object-cover"
      />
      <div className="flex flex-1 flex-col justify-end p-2">
        {post.kindness_question && (
          <div className="mb-1">
            <KindnessBadge text={post.kindness_question} variant="card" />
          </div>
        )}
        {post.text && <p className="line-clamp-3 text-xs text-neutral-800">{post.text}</p>}
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[10px] font-medium" style={{ color: 'var(--event-secondary)' }}>
            {post.author_name}
          </p>
          {reactionCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-neutral-400">
              <Heart size={10} fill="currentColor" /> {reactionCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
