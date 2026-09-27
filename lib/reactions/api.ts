import { createClient } from '@/lib/supabase/client';
import type { ReactionRow, ReactionEmoji } from '@/lib/supabase/types';

export async function getReactionsForPosts(postIds: string[]): Promise<ReactionRow[]> {
  if (postIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase.from('reactions').select('*').in('post_id', postIds);
  if (error) throw error;
  return data ?? [];
}

/**
 * Reaktion umschalten: existiert sie schon (gleicher Gast, gleicher Post,
 * gleiches Emoji), wird sie gelöscht, sonst neu angelegt. Der
 * UNIQUE(post_id, guest_id, reaction)-Constraint verhindert Duplikate
 * ohnehin serverseitig, das hier ist nur die Client-Logik fürs Toggle-UI.
 */
export async function toggleReaction(
  eventId: string,
  postId: string,
  guestId: string,
  reaction: ReactionEmoji,
  currentlyActive: boolean
): Promise<void> {
  const supabase = createClient();
  if (currentlyActive) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('post_id', postId)
      .eq('guest_id', guestId)
      .eq('reaction', reaction);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('reactions')
      .insert({ event_id: eventId, post_id: postId, guest_id: guestId, reaction });
    if (error) throw error;
  }
}
