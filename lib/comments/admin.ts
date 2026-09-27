import { createClient } from '@/lib/supabase/client';
import type { CommentRow } from '@/lib/supabase/types';

export async function getPendingComments(eventId: string): Promise<CommentRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function setCommentStatus(
  commentId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('comments').update({ status }).eq('id', commentId);
  if (error) throw error;
}
