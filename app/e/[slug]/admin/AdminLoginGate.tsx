import { MagicLinkLoginCard } from '@/components/MagicLinkLoginCard';

export function AdminLoginGate({ eventSlug }: { eventSlug: string }) {
  return <MagicLinkLoginCard title="Admin-Login" redirectPath={`/e/${eventSlug}/admin`} />;
}
