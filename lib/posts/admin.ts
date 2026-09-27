import { createClient } from '@/lib/supabase/client';
import type { PostRow } from '@/lib/supabase/types';

export async function getPendingPosts(eventId: string): Promise<PostRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Für den Admin-Export: alle approved Posts eines Events, ohne das
 * niedrige Limit der Live-Wall-Anzeige (getApprovedPosts in posts/api.ts
 * ist bewusst für die Wall-Darstellung limitiert, nicht für Exporte).
 */
export async function getAllApprovedPostsForExport(eventId: string): Promise<PostRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(2000);

  if (error) throw error;
  return data ?? [];
}

/**
 * Setzt den Status eines Posts. Die eigentliche Berechtigungsprüfung
 * übernimmt RLS (event_admins_all_posts) – schlägt der Request fehl,
 * war der Aufrufer schlicht kein Admin dieses Events.
 */
export async function setPostStatus(
  postId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('posts').update({ status }).eq('id', postId);
  if (error) throw error;
}
