/**
 * Handgeschriebene Typen passend zum Schema in /supabase/001_core_schema.sql.
 *
 * TODO sobald das Supabase-Projekt live ist:
 *   npx supabase gen types typescript --project-id <ID> > lib/supabase/database.types.ts
 * und diese Datei durch die generierten Typen ersetzen bzw. re-exportieren.
 * Bis dahin: von Hand synchron halten mit den Migrationen.
 */

export type EventStatus = 'draft' | 'active' | 'archived';
export type EventType = 'wedding' | 'birthday' | 'corporate' | 'festival' | 'other';
export type LiveWallMode = 'grid' | 'single' | 'slideshow';
export type PostStatus = 'pending' | 'approved' | 'rejected';
export type MediaType = 'photo' | 'video';
export type ModuleKey = 'wish_wall' | 'kindness_wall' | 'group_chat' | 'polls' | 'schedule' | 'potluck' | 'video_upload';
export type AdminRole = 'owner' | 'admin';

export type BeamerThemeKey = 'zouk' | 'midnight' | 'modern';
export type BeamerTransitionKey = 'ambient-glow' | 'ken-burns' | 'slide-fade';

export interface EventTheme {
  primary_color: string;
  secondary_color: string;
  bg_color: string;
  text_color: string;
  button_color: string;
  beamer_theme?: BeamerThemeKey;
  beamer_transition?: BeamerTransitionKey;
}

export type BeamerMode = 'rotation' | 'grid';

export interface EventRow {
  id: string;
  slug: string;
  name: string;
  event_type: EventType;
  date_start: string | null;
  date_end: string | null;
  description: string | null;
  cover_url: string | null;
  logo_url: string | null;
  theme: EventTheme;
  live_wall_mode: LiveWallMode;
  moderation_enabled: boolean;
  beamer_enabled: boolean;
  beamer_mode: BeamerMode;
  beamer_interval_seconds: number;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface GuestRow {
  id: string;
  event_id: string;
  user_id: string;
  name: string;
  discoverable: boolean;
  blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostRow {
  id: string;
  event_id: string;
  author_id: string;
  author_name: string;
  text: string | null;
  media_type: MediaType | null;
  storage_path: string | null;
  kindness_prompt_id: string | null;
  kindness_question: string | null;
  status: PostStatus;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

export interface CommentRow {
  id: string;
  event_id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  text: string;
  status: PostStatus;
  created_at: string;
}

export const REACTION_EMOJIS = ['❤️', '🔥', '👏', '😍', '🕺'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface ReactionRow {
  id: string;
  event_id: string;
  post_id: string;
  guest_id: string;
  reaction: ReactionEmoji;
  created_at: string;
}

export interface KindnessPromptRow {
  id: string;
  event_id: string;
  question: string;
  active: boolean;
  created_at: string;
}

export type PotluckCategory = 'starter' | 'main' | 'dessert' | 'drinks' | 'other';

export const POTLUCK_CATEGORIES: { value: PotluckCategory; label: string }[] = [
  { value: 'starter', label: 'Vorspeise' },
  { value: 'main', label: 'Hauptgang' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'drinks', label: 'Getränke' },
  { value: 'other', label: 'Sonstiges' },
];

export interface PotluckItemRow {
  id: string;
  event_id: string;
  author_id: string;
  author_name: string;
  category: PotluckCategory;
  item_text: string;
  quantity: string | null;
  created_at: string;
}

export interface WishRequestRow {
  id: string;
  event_id: string;
  author_id: string;
  author_name: string;
  text: string;
  created_at: string;
}

export interface WishVoteRow {
  id: string;
  event_id: string;
  wish_id: string;
  guest_id: string;
  created_at: string;
}

export interface EventModuleRow {
  event_id: string;
  module_key: ModuleKey;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface EventAdminRow {
  event_id: string;
  user_id: string;
  role: AdminRole;
  created_at: string;
}

/**
 * Minimales Database-Interface, ausreichend um den typisierten
 * Supabase-Client (createBrowserClient<Database>(...)) zufriedenzustellen.
 * Nur die Tabellen, die die Foundation-Schicht bereits anfasst.
 */
export interface Database {
  public: {
    Tables: {
      events: {
        Row: EventRow;
        Insert: Partial<EventRow>;
        Update: Partial<EventRow>;
      };
      guests: {
        Row: GuestRow;
        Insert: Partial<GuestRow>;
        Update: Partial<GuestRow>;
      };
      posts: {
        Row: PostRow;
        Insert: Partial<PostRow>;
        Update: Partial<PostRow>;
      };
      event_modules: {
        Row: EventModuleRow;
        Insert: Partial<EventModuleRow>;
        Update: Partial<EventModuleRow>;
      };
      event_admins: {
        Row: EventAdminRow;
        Insert: Partial<EventAdminRow>;
        Update: Partial<EventAdminRow>;
      };
    };
    Functions: {
      is_event_admin: {
        Args: { p_event_id: string };
        Returns: boolean;
      };
      create_event_with_owner: {
        Args: { p_slug: string; p_name: string; p_event_type?: EventType };
        Returns: EventRow;
      };
    };
  };
}
