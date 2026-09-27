import { createClient } from '@/lib/supabase/client';

export interface EventStats {
  guestCount: number;
  photoCount: number;
  pendingPostCount: number;
  pendingCommentCount: number;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  const supabase = createClient();

  const [guests, photos, pendingPosts, pendingComments] = await Promise.all([
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'approved')
      .not('storage_path', 'is', null),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'pending'),
    supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'pending'),
  ]);

  return {
    guestCount: guests.count ?? 0,
    photoCount: photos.count ?? 0,
    pendingPostCount: pendingPosts.count ?? 0,
    pendingCommentCount: pendingComments.count ?? 0,
  };
}
