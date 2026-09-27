import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { firstZodMessage } from '@/lib/validation/schemas';
import type { WishRequestRow, WishVoteRow } from '@/lib/supabase/types';

export const wishTextSchema = z
  .string()
  .trim()
  .min(1, 'Bitte einen Wunsch eingeben.')
  .max(220, 'Wunsch darf maximal 220 Zeichen haben.');

export async function getWishRequests(eventId: string): Promise<WishRequestRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wish_requests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getWishVotes(eventId: string): Promise<WishVoteRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('wish_votes').select('*').eq('event_id', eventId);
  if (error) throw error;
  return data ?? [];
}

export async function createWish(
  eventId: string,
  guestId: string,
  authorName: string,
  text: string
): Promise<WishRequestRow> {
  const parsed = wishTextSchema.safeParse(text);
  if (!parsed.success) throw new Error(firstZodMessage(parsed.error));

  const supabase = createClient();
  const { data, error } = await supabase
    .from('wish_requests')
    .insert({
      event_id: eventId,
      author_id: guestId,
      author_name: authorName.trim().slice(0, 50),
      text: parsed.data,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleWishVote(
  eventId: string,
  wishId: string,
  guestId: string,
  currentlyActive: boolean
): Promise<void> {
  const supabase = createClient();
  if (currentlyActive) {
    const { error } = await supabase
      .from('wish_votes')
      .delete()
      .eq('wish_id', wishId)
      .eq('guest_id', guestId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('wish_votes')
      .insert({ event_id: eventId, wish_id: wishId, guest_id: guestId });
    if (error) throw error;
  }
}
