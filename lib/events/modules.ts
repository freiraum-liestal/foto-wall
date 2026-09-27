import { createClient } from '@/lib/supabase/client';
import type { ModuleKey } from '@/lib/supabase/types';

/**
 * Welche Module sind für ein Event aktiv? Genutzt sowohl von Gästen (um
 * zu entscheiden, welche Tabs überhaupt angezeigt werden) als auch von
 * Admins (Einstellungen). RLS (event_modules_read_guests) erlaubt das
 * Lesen bereits ab "aktiver Gast dieses Events" - kein Sonderfall nötig.
 */
export async function getEnabledModules(eventId: string): Promise<Set<ModuleKey>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('event_modules')
    .select('module_key, enabled')
    .eq('event_id', eventId);
  if (error) throw error;
  return new Set((data ?? []).filter((m) => m.enabled).map((m) => m.module_key));
}

export async function setModuleEnabled(
  eventId: string,
  moduleKey: ModuleKey,
  enabled: boolean
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('event_modules')
    .upsert(
      { event_id: eventId, module_key: moduleKey, enabled },
      { onConflict: 'event_id,module_key' }
    );
  if (error) throw error;
}
