-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Summaries table
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_title TEXT NOT NULL DEFAULT 'Untitled Video',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  short_summary TEXT NOT NULL,
  detailed_summary TEXT NOT NULL,
  key_takeaways JSONB NOT NULL DEFAULT '[]',
  important_insights JSONB NOT NULL DEFAULT '[]',
  key_moments JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Summaries
DROP POLICY IF EXISTS "Users can view their own summaries" ON public.summaries;
CREATE POLICY "Users can view their own summaries"
  ON public.summaries
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own summaries" ON public.summaries;
CREATE POLICY "Users can insert their own summaries"
  ON public.summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own summaries" ON public.summaries;
CREATE POLICY "Users can delete their own summaries"
  ON public.summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS summaries_user_id_idx ON public.summaries(user_id);
CREATE INDEX IF NOT EXISTS summaries_created_at_idx ON public.summaries(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_summaries_updated_at ON public.summaries;
CREATE TRIGGER update_summaries_updated_at
  BEFORE UPDATE ON public.summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Translations table for caching
CREATE TABLE IF NOT EXISTS public.translations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hash TEXT UNIQUE NOT NULL,
    original_text TEXT,
    target_language TEXT,
    translated_text TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for translations
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own translations" ON public.translations;
CREATE POLICY "Users can manage their own translations" 
  ON public.translations 
  FOR ALL 
  USING (auth.uid() = user_id);
