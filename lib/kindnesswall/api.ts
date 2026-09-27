import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { firstZodMessage } from '@/lib/validation/schemas';
import type { KindnessPromptRow } from '@/lib/supabase/types';

export const kindnessQuestionSchema = z
  .string()
  .trim()
  .min(1, 'Bitte eine Frage eingeben.')
  .max(200, 'Frage darf maximal 200 Zeichen haben.');

export async function getActivePrompt(eventId: string): Promise<KindnessPromptRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kindness_prompts')
    .select('*')
    .eq('event_id', eventId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Admin-Aktion: neue aktive Frage setzen. Deaktiviert alle bisherigen
 * Prompts des Events dabei - es gibt bewusst immer nur EINE aktive Frage
 * gleichzeitig (gleiches Modell wie in der alten App).
 */
export async function setActivePrompt(eventId: string, question: string): Promise<KindnessPromptRow> {
  const parsed = kindnessQuestionSchema.safeParse(question);
  if (!parsed.success) throw new Error(firstZodMessage(parsed.error));

  const supabase = createClient();

  const { error: deactivateError } = await supabase
    .from('kindness_prompts')
    .update({ active: false })
    .eq('event_id', eventId)
    .eq('active', true);
  if (deactivateError) throw deactivateError;

  const { data, error } = await supabase
    .from('kindness_prompts')
    .insert({ event_id: eventId, question: parsed.data, active: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}
