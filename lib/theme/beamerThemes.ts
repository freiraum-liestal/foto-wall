import type { BeamerThemeKey, BeamerTransitionKey, EventTheme } from '@/lib/supabase/types';

export interface BeamerThemePreset {
  id: BeamerThemeKey;
  name: string;
  tagline: string;
  description: string;
  isDark: boolean;
  theme: EventTheme;
  visuals: {
    bgGradient: string;
    ambientGlow: string;
    cardBg: string;
    cardBorder: string;
    cardShadow: string;
    textColor: string;
    quoteColor: string;
    authorColor: string;
    accentColor: string;
    badgeBg: string;
    badgeText: string;
    qrCardBg: string;
    qrCardBorder: string;
    qrCardText: string;
    progressBarColor: string;
    fontHeadline: string;
    fontBody: string;
  };
}

export const BEAMER_THEMES: Record<BeamerThemeKey, BeamerThemePreset> = {
  zouk: {
    id: 'zouk',
    name: 'Standard',
    tagline: 'Warmes Boho & Earthy Design',
    description:
      'Warmes Sandpapier, Deep Forest Teal (#1c3f38), Sonnengold (#f2b705) und leuchtendes Bernstein (#d97b29) – zeitlos und harmonisch.',
    isDark: false,
    theme: {
      primary_color: '#1c3f38',
      secondary_color: '#d97b29',
      bg_color: '#f6f4ec',
      text_color: '#241d12',
      button_color: '#f2b705',
      beamer_theme: 'zouk',
      beamer_transition: 'ambient-glow',
    },
    visuals: {
      bgGradient:
        'radial-gradient(ellipse at 50% 15%, #fff6d9 0%, #f7ecd2 35%, #f6f4ec 75%, #ece7d7 100%)',
      ambientGlow: 'rgba(242, 183, 5, 0.25)',
      cardBg: 'rgba(255, 255, 255, 0.92)',
      cardBorder: '1px solid rgba(217, 123, 41, 0.25)',
      cardShadow: '0 25px 50px -12px rgba(36, 29, 18, 0.15), 0 0 0 1px rgba(242, 183, 5, 0.15)',
      textColor: '#241d12',
      quoteColor: '#1c3f38',
      authorColor: '#d97b29',
      accentColor: '#f2b705',
      badgeBg: 'rgba(28, 63, 56, 0.08)',
      badgeText: '#1c3f38',
      qrCardBg: 'rgba(255, 255, 255, 0.94)',
      qrCardBorder: '1px solid rgba(217, 123, 41, 0.2)',
      qrCardText: '#241d12',
      progressBarColor: 'linear-gradient(90deg, #f2b705, #d97b29, #1c3f38)',
      fontHeadline: 'serif',
      fontBody: 'sans-serif',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Cinema',
    tagline: 'Deep Dark & Ambient Neon Glow',
    description:
      'Tiefes Nachtschwarz, Glassmorphism-Karten und vibrierender Ambient-Glow – perfekt für Partys, Club-Nächte und abgedunkelte Räume.',
    isDark: true,
    theme: {
      primary_color: '#f8fafc',
      secondary_color: '#a78bfa',
      bg_color: '#09090b',
      text_color: '#f1f5f9',
      button_color: '#8b5cf6',
      beamer_theme: 'midnight',
      beamer_transition: 'ambient-glow',
    },
    visuals: {
      bgGradient:
        'radial-gradient(ellipse at 50% 10%, #1e1138 0%, #0d091a 45%, #09090b 80%, #030305 100%)',
      ambientGlow: 'rgba(139, 92, 246, 0.35)',
      cardBg: 'rgba(18, 18, 24, 0.75)',
      cardBorder: '1px solid rgba(255, 255, 255, 0.12)',
      cardShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(139, 92, 246, 0.2)',
      textColor: '#f1f5f9',
      quoteColor: '#ffffff',
      authorColor: '#a78bfa',
      accentColor: '#38bdf8',
      badgeBg: 'rgba(139, 92, 246, 0.2)',
      badgeText: '#c4b5fd',
      qrCardBg: 'rgba(15, 15, 22, 0.85)',
      qrCardBorder: '1px solid rgba(139, 92, 246, 0.3)',
      qrCardText: '#f8fafc',
      progressBarColor: 'linear-gradient(90deg, #8b5cf6, #38bdf8, #ec4899)',
      fontHeadline: 'sans-serif',
      fontBody: 'sans-serif',
    },
  },
  modern: {
    id: 'modern',
    name: 'Clean Modern Gallery',
    tagline: 'Minimalistische Kunstgalerie & Champagner',
    description:
      'Heller, feiner Galerie-Look mit sanften Schatten, minimalistischer Eleganz und feinen Champagner-Gold-Akzenten.',
    isDark: false,
    theme: {
      primary_color: '#0f172a',
      secondary_color: '#b45309',
      bg_color: '#faf8f5',
      text_color: '#1e293b',
      button_color: '#d97706',
      beamer_theme: 'modern',
      beamer_transition: 'ambient-glow',
    },
    visuals: {
      bgGradient:
        'radial-gradient(ellipse at 50% 20%, #ffffff 0%, #fbf9f6 50%, #f4f0e8 100%)',
      ambientGlow: 'rgba(217, 119, 6, 0.18)',
      cardBg: 'rgba(255, 255, 255, 0.95)',
      cardBorder: '1px solid rgba(226, 219, 205, 0.8)',
      cardShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.1), 0 4px 12px rgba(0, 0, 0, 0.03)',
      textColor: '#1e293b',
      quoteColor: '#0f172a',
      authorColor: '#b45309',
      accentColor: '#d97706',
      badgeBg: 'rgba(217, 119, 6, 0.08)',
      badgeText: '#92400e',
      qrCardBg: 'rgba(255, 255, 255, 0.95)',
      qrCardBorder: '1px solid rgba(226, 219, 205, 0.8)',
      qrCardText: '#0f172a',
      progressBarColor: 'linear-gradient(90deg, #d97706, #b45309, #0f172a)',
      fontHeadline: 'sans-serif',
      fontBody: 'sans-serif',
    },
  },
};

export const BEAMER_TRANSITIONS: {
  id: BeamerTransitionKey;
  name: string;
  description: string;
}[] = [
  {
    id: 'ambient-glow',
    name: 'Ambient-Glow & Crossfade',
    description: 'Weichgezeichnete Hintergrund-Lichtaura in Echtzeit passend zum aktuellen Bild.',
  },
  {
    id: 'ken-burns',
    name: 'Ken-Burns Zoom & Pan',
    description: 'Sanfter, cineastischer Kamera-Zoom für eine lebendige Bilddynamik.',
  },
  {
    id: 'slide-fade',
    name: 'Smooth Slide & Fade',
    description: 'Eleganter, weicher horizontaler Gleitübergang mit feiner Tiefenwirkung.',
  },
];

export function getBeamerPreset(key?: BeamerThemeKey | null): BeamerThemePreset {
  if (key && BEAMER_THEMES[key]) {
    return BEAMER_THEMES[key];
  }
  return BEAMER_THEMES.zouk;
}
