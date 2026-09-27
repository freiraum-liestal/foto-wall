import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
// TODO: <Database> aus generierten Typen einsetzen, siehe lib/supabase/client.ts

/**
 * Supabase-Client für Server Components / Route Handlers / Server Actions.
 * Liest & schreibt die Auth-Session über Next.js Cookies (Server-Side Rendering
 * kompatibel). Wichtig: in Server Components darf nur gelesen werden – das
 * Schreiben von Cookies (Login/Logout) muss über eine Route Handler / Server
 * Action laufen, siehe app/auth/callback/route.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen. Siehe .env.local.example.'
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as CookieOptions);
          });
        } catch {
          // In Server Components (nicht Route Handler/Server Action) darf
          // nicht geschrieben werden. Das ignorieren wir hier bewusst,
          // solange die Middleware die Session sauber refresht.
        }
      },
    },
  });
}
