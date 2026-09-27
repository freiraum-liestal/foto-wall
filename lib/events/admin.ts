import { createClient } from '@/lib/supabase/client';
import type { EventRow, EventTheme, EventType, LiveWallMode, BeamerMode } from '@/lib/supabase/types';
import {
  eventNameSchema,
  eventSlugSchema,
  themeSchema,
  beamerIntervalSchema,
  firstZodMessage,
} from '@/lib/validation/schemas';

export async function createEvent(
  slug: string,
  name: string,
  eventType: EventType = 'other'
): Promise<EventRow> {
  const slugResult = eventSlugSchema.safeParse(slug);
  if (!slugResult.success) throw new Error(firstZodMessage(slugResult.error));
  const nameResult = eventNameSchema.safeParse(name);
  if (!nameResult.success) throw new Error(firstZodMessage(nameResult.error));

  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_event_with_owner', {
    p_slug: slugResult.data,
    p_name: nameResult.data,
    p_event_type: eventType,
  });
  if (error) throw error;
  return data as EventRow;
}

export interface EventSettingsPatch {
  name?: string;
  description?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  theme?: EventTheme;
  moderation_enabled?: boolean;
  live_wall_mode?: LiveWallMode;
  status?: 'draft' | 'active' | 'archived';
  logo_url?: string | null;
  beamer_enabled?: boolean;
  beamer_mode?: BeamerMode;
  beamer_interval_seconds?: number;
}

/**
 * Aktualisiert Event-Einstellungen. RLS (events_update_own_admin) ist die
 * eigentliche Berechtigungsprüfung - dieser Call schlägt einfach fehl,
 * wenn der Aufrufer kein Admin dieses Events ist.
 */
export async function updateEventSettings(
  eventId: string,
  patch: EventSettingsPatch
): Promise<EventRow> {
  if (patch.theme) {
    const themeResult = themeSchema.safeParse(patch.theme);
    if (!themeResult.success) throw new Error(firstZodMessage(themeResult.error));
  }
  if (patch.name !== undefined) {
    const nameResult = eventNameSchema.safeParse(patch.name);
    if (!nameResult.success) throw new Error(firstZodMessage(nameResult.error));
    patch = { ...patch, name: nameResult.data };
  }
  if (patch.beamer_interval_seconds !== undefined) {
    const intervalResult = beamerIntervalSchema.safeParse(patch.beamer_interval_seconds);
    if (!intervalResult.success) throw new Error(firstZodMessage(intervalResult.error));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', eventId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Liste der Events, die der eingeloggte Nutzer administriert.
 *
 * WICHTIG: bewusst zwei Queries, nicht direkt `select * from events`.
 * events_read_active ist eine permissive Policy, die JEDES aktive Event
 * für JEDEN lesbar macht (das ist Absicht - Gäste müssen ihr Event ohne
 * Login finden können). Ein direktes `select * from events` würde daher
 * nicht nur die eigenen, sondern auch fremde aktive Events zurückgeben.
 * Über event_admins vorzufiltern und dann per .in('id', ...) zu laden,
 * stellt sicher, dass nur tatsächlich verwaltete Events zurückkommen.
 */
export async function getMyEvents(): Promise<EventRow[]> {
  const supabase = createClient();
  const { data: adminRows, error: adminError } = await supabase
    .from('event_admins')
    .select('event_id');
  if (adminError) throw adminError;

  const eventIds = (adminRows ?? []).map((r) => r.event_id);
  if (eventIds.length === 0) return [];

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .in('id', eventIds)
    .order('created_at', { ascending: false });
  if (eventsError) throw eventsError;
  return events ?? [];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Akzente entfernen (ä->a etc.)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
