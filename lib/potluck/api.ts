import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { firstZodMessage } from '@/lib/validation/schemas';
import type { PotluckItemRow, PotluckCategory } from '@/lib/supabase/types';

export const potluckItemTextSchema = z
  .string()
  .trim()
  .min(1, 'Bitte angeben, was du mitbringst.')
  .max(120, 'Maximal 120 Zeichen.');

export const potluckQuantitySchema = z
  .string()
  .trim()
  .max(50, 'Maximal 50 Zeichen.')
  .optional();

export async function getPotluckItems(eventId: string): Promise<PotluckItemRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('potluck_items')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface CreatePotluckItemInput {
  eventId: string;
  guestId: string;
  authorName: string;
  category: PotluckCategory;
  itemText: string;
  quantity?: string;
}

export async function createPotluckItem(input: CreatePotluckItemInput): Promise<PotluckItemRow> {
  const textResult = potluckItemTextSchema.safeParse(input.itemText);
  if (!textResult.success) throw new Error(firstZodMessage(textResult.error));
  const quantityResult = potluckQuantitySchema.safeParse(input.quantity ?? '');
  if (!quantityResult.success) throw new Error(firstZodMessage(quantityResult.error));

  const supabase = createClient();
  const { data, error } = await supabase
    .from('potluck_items')
    .insert({
      event_id: input.eventId,
      author_id: input.guestId,
      author_name: input.authorName.trim().slice(0, 50),
      category: input.category,
      item_text: textResult.data,
      quantity: quantityResult.data || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOwnPotluckItem(itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('potluck_items').delete().eq('id', itemId);
  if (error) throw error;
}
