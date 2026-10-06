-- ============================================================
--  Ishuz — Supabase Schema (Clean & Idempotent)
--  Paste into Supabase SQL Editor and click "Run"
-- ============================================================

-- Clean up any existing tables from prior attempts
DROP TABLE IF EXISTS public.answers_list CASCADE;
DROP TABLE IF EXISTS public.questions_list CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ── 1. PROFILES (links to Supabase auth.users) ──────────────
CREATE TABLE public.profiles (
  id             UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name      VARCHAR(12)  UNIQUE NOT NULL,
  email          VARCHAR(100) NOT NULL,
  first_name     VARCHAR(15)  NOT NULL DEFAULT '',
  last_name      VARCHAR(15)  NOT NULL DEFAULT '',
  country        VARCHAR(30)  NOT NULL DEFAULT '',
  state_provice  VARCHAR(30)  NOT NULL DEFAULT '',
  county         VARCHAR(20),
  city_town      VARCHAR(30),
  language       VARCHAR(30)  NOT NULL DEFAULT '',
  info_source    VARCHAR(100) NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ── 2. QUESTIONS ───────────────────────────────────────────
CREATE TABLE public.questions_list (
  question_id   SERIAL       PRIMARY KEY,
  user_id       UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  question_text VARCHAR(300) NOT NULL,
  question_type VARCHAR(15)  NOT NULL CHECK (question_type IN ('multiple choice', 'free text', 'numeric')),
  answer_a      VARCHAR(100) DEFAULT '',
  answer_b      VARCHAR(100) DEFAULT '',
  answer_c      VARCHAR(100) DEFAULT '',
  answer_d      VARCHAR(100) DEFAULT '',
  answer_e      VARCHAR(100) DEFAULT '',
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ── 3. ANSWERS ─────────────────────────────────────────────
CREATE TABLE public.answers_list (
  answer_id        SERIAL       PRIMARY KEY,
  question_id      INTEGER      REFERENCES public.questions_list(question_id) ON DELETE CASCADE,
  user_id          UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  answer_text_mc   VARCHAR(100) NOT NULL DEFAULT '',
  answer_text_num  NUMERIC,
  answer_text_free VARCHAR(300) NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ── 4. ROW LEVEL SECURITY (RLS) & GRANTS ──────────────────
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers_list   ENABLE ROW LEVEL SECURITY;

-- Grant schema and table access to API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Profiles policies
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Questions policies
CREATE POLICY "questions_select_all" ON public.questions_list FOR SELECT USING (true);
CREATE POLICY "questions_insert_auth" ON public.questions_list FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Answers policies
CREATE POLICY "answers_select_all" ON public.answers_list FOR SELECT USING (true);
CREATE POLICY "answers_insert_auth" ON public.answers_list FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── 5. SEED DATA ───────────────────────────────────────────
INSERT INTO public.questions_list
  (user_id, question_text, question_type, answer_a, answer_b, answer_c, answer_d, answer_e)
VALUES
  (NULL,
   'How to stop global warming?',
   'multiple choice',
   'turn off lights when not using',
   'stop smoking',
   'get a home energy audit',
   'take a shower instead of a bath',
   'be sure you are recycling at home'),

  (NULL,
   'Do you think that wasting water is bad?',
   'multiple choice',
   'yes', 'no', '', '', ''),

  (NULL,
   'Is republican more environmental than democrats?',
   'multiple choice',
   'yes', 'no', 'it depends', '', '');
