import { createClient } from '@/lib/supabase/client';
import type { CommentRow } from '@/lib/supabase/types';
import { z } from 'zod';
import { firstZodMessage } from '@/lib/validation/schemas';

export const commentTextSchema = z
  .string()
  .trim()
  .min(1, 'Bitte einen Text eingeben.')
  .max(300, 'Kommentar darf maximal 300 Zeichen haben.');

export async function getApprovedComments(postId: string): Promise<CommentRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface CreateCommentInput {
  eventId: string;
  postId: string;
  guestId: string;
  authorName: string;
  text: string;
  moderationEnabled: boolean;
}

export async function createComment(input: CreateCommentInput): Promise<CommentRow> {
  const parsed = commentTextSchema.safeParse(input.text);
  if (!parsed.success) throw new Error(firstZodMessage(parsed.error));

  const supabase = createClient();
  const status = input.moderationEnabled ? 'pending' : 'approved';

  const { data, error } = await supabase
    .from('comments')
    .insert({
      event_id: input.eventId,
      post_id: input.postId,
      author_id: input.guestId,
      author_name: input.authorName.trim().slice(0, 50),
      text: parsed.data,
      status,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
