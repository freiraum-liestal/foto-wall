import { z } from 'zod';
import { MEDIA_CONFIG } from '@/lib/config';

/**
 * Zentrale Validierung an den Stellen, wo bisher nur die DB-Constraints
 * (die erst NACH dem Request greifen) für Sicherheit gesorgt haben. Zod
 * ersetzt keine RLS/DB-Constraints - die bleiben die eigentliche
 * Sicherheitsgrenze - sondern gibt dem Nutzer sofortiges Feedback, bevor
 * überhaupt ein Request rausgeht.
 */

export const guestNameSchema = z
  .string()
  .trim()
  .min(1, 'Bitte gib einen Namen ein.')
  .max(50, 'Name darf maximal 50 Zeichen haben.');

export const eventNameSchema = z
  .string()
  .trim()
  .min(1, 'Bitte gib einen Namen ein.')
  .max(100, 'Name darf maximal 100 Zeichen haben.');

export const eventSlugSchema = z
  .string()
  .trim()
  .min(3, 'Slug muss mindestens 3 Zeichen haben.')
  .max(60, 'Slug darf maximal 60 Zeichen haben.')
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'Nur Kleinbuchstaben, Ziffern und Bindestriche erlaubt (z.B. "anna-marco").'
  );

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Muss eine gültige Hex-Farbe sein (z.B. #16302b).');

export const themeSchema = z.object({
  primary_color: hexColorSchema,
  secondary_color: hexColorSchema,
  bg_color: hexColorSchema,
  text_color: hexColorSchema,
  button_color: hexColorSchema,
  beamer_theme: z.enum(['zouk', 'midnight', 'modern']).optional(),
  beamer_transition: z.enum(['ambient-glow', 'ken-burns', 'slide-fade']).optional(),
});

export const beamerIntervalSchema = z
  .number()
  .int()
  .min(3, 'Mindestens 3 Sekunden.')
  .max(60, 'Maximal 60 Sekunden.');

export const postTextSchema = z
  .string()
  .trim()
  .max(MEDIA_CONFIG.TEXT_MAX_LENGTH, `Text darf maximal ${MEDIA_CONFIG.TEXT_MAX_LENGTH} Zeichen haben.`);

/**
 * Post braucht Text ODER Foto - dieselbe Regel wie der DB-Constraint
 * posts_has_content, hier nur früher (im Formular) geprüft.
 */
export const postInputSchema = z
  .object({
    text: z.string().trim().max(MEDIA_CONFIG.TEXT_MAX_LENGTH).optional().nullable(),
    hasMedia: z.boolean(),
  })
  .refine((data) => Boolean(data.text) || data.hasMedia, {
    message: 'Bitte ein Foto wählen oder einen Text schreiben.',
  });

/**
 * Extrahiert eine nutzerfreundliche Fehlermeldung aus einem ZodError,
 * damit Aufrufer nicht jedes Mal error.issues[0].message tippen müssen.
 */
export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Ungültige Eingabe.';
}
