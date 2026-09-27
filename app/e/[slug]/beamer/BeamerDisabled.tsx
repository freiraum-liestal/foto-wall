export function BeamerDisabled({
  eventName,
  logoUrl,
}: {
  eventName: string;
  logoUrl: string | null;
}) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 text-center">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={eventName} className="h-20 w-20 object-contain opacity-60" />
      )}
      <p className="text-2xl font-semibold opacity-60" style={{ color: 'var(--event-primary)' }}>
        {eventName}
      </p>
      <p className="text-sm opacity-40">Beamer-Ansicht ist aktuell deaktiviert.</p>
    </div>
  );
}
