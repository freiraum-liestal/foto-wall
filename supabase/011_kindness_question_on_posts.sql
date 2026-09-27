-- ============================================================
-- Event-SaaS-Plattform – Migration 011
-- Kindness-Antworten sollen wieder auf der allgemeinen Live Wall/Beamer
-- erscheinen (statt nur im eigenen Tab), aber erkennbar als solche -
-- dafür braucht die Anzeige die Frage, zu der ein Post gehört.
--
-- kindness_question wird NICHT vom Client übernommen, sondern per
-- Trigger serverseitig aus kindness_prompts nachgeschlagen - ein Gast
-- könnte sonst eine falsche/manipulierte Frage mitschicken.
-- ============================================================

ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS kindness_question TEXT;

CREATE OR REPLACE FUNCTION public.set_kindness_question()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.kindness_prompt_id IS NOT NULL THEN
        SELECT question INTO NEW.kindness_question
        FROM public.kindness_prompts
        WHERE id = NEW.kindness_prompt_id;
    ELSE
        NEW.kindness_question = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_set_kindness_question ON public.posts;
CREATE TRIGGER posts_set_kindness_question
    BEFORE INSERT OR UPDATE OF kindness_prompt_id ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.set_kindness_question();
