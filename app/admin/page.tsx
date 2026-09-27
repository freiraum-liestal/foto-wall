import { createClient } from '@/lib/supabase/server';
import { MagicLinkLoginCard } from '@/components/MagicLinkLoginCard';
import { EventDashboard } from './EventDashboard';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <MagicLinkLoginCard title="Event-Admin-Login" redirectPath="/admin" />;
  }

  return <EventDashboard />;
}
