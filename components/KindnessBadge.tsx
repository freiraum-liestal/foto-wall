type KindnessBadgeVariant = 'card' | 'modal' | 'beamer' | 'swipe';

const VARIANT_CLASSES: Record<KindnessBadgeVariant, string> = {
  card: 'text-[9px] px-2 py-0.5',
  modal: 'text-xs px-2 py-1',
  beamer: 'text-lg uppercase tracking-wide px-4 py-1',
  swipe: 'text-[10px] uppercase tracking-wide px-2 py-0.5',
};

/**
 * Ersetzt die 💛-Pille, die bisher in LiveWallGrid (Karte + Modal),
 * BeamerView und LiveWallSwipe fast wortgleich dupliziert war - nur
 * Grösse/Kontrast unterschieden sich je nach hellem/dunklem Hintergrund.
 */
export function KindnessBadge({
  text,
  variant,
  className = '',
}: {
  text: string;
  variant: KindnessBadgeVariant;
  className?: string;
}) {
  const onDark = variant === 'swipe';
  return (
    <span
      className={`inline-block self-start rounded-full font-medium ${VARIANT_CLASSES[variant]} ${className}`}
      style={{
        backgroundColor: onDark
          ? 'rgba(255,255,255,0.15)'
          : 'color-mix(in srgb, var(--event-button) 18%, transparent)',
        color: onDark ? 'white' : 'var(--event-primary)',
      }}
    >
      💛 {text}
    </span>
  );
}
