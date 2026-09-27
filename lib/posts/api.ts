import { createClient } from '@/lib/supabase/client';
import type { PostRow } from '@/lib/supabase/types';
import { postInputSchema, firstZodMessage } from '@/lib/validation/schemas';

export interface CreatePostInput {
  eventId: string;
  guestId: string;
  authorName: string;
  text?: string | null;
  mediaType?: 'photo' | 'video' | null;
  storagePath?: string | null;
  moderationEnabled: boolean;
  kindnessPromptId?: string | null;
}

/**
 * Erstellt einen Post. status wird hier vorgeschlagen, aber die RLS-Policy
 * posts_insert_own ist die eigentliche Instanz, die entscheidet, ob
 * status='approved' überhaupt erlaubt ist (nur wenn moderation_enabled=false
 * am Event tatsächlich stimmt) – dieser Client-Wert ist nur ein Vorschlag,
 * kein Vertrauensanker.
 */
export async function createPost(input: CreatePostInput): Promise<PostRow> {
  const validation = postInputSchema.safeParse({
    text: input.text,
    hasMedia: Boolean(input.storagePath),
  });
  if (!validation.success) {
    throw new Error(firstZodMessage(validation.error));
  }

  const supabase = createClient();
  const status = input.moderationEnabled ? 'pending' : 'approved';

  const { data, error } = await supabase
    .from('posts')
    .insert({
      event_id: input.eventId,
      author_id: input.guestId,
      author_name: input.authorName.trim().slice(0, 50),
      text: input.text?.trim() || null,
      media_type: input.mediaType ?? null,
      storage_path: input.storagePath ?? null,
      status,
      kindness_prompt_id: input.kindnessPromptId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getApprovedPosts(eventId: string, limit = 60): Promise<PostRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
