-- ==============================================================================
-- QUEST LOG RPG - SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  level INT DEFAULT 1 CHECK (level >= 1),
  exp INT DEFAULT 0 CHECK (exp >= 0),
  hp INT DEFAULT 100 CHECK (hp >= 0 AND hp <= 100),
  gold INT DEFAULT 50 CHECK (gold >= 0),
  streak INT DEFAULT 0 CHECK (streak >= 0),
  frozen_days INT DEFAULT 0 CHECK (frozen_days >= 0),
  double_xp BOOLEAN DEFAULT false,
  title TEXT DEFAULT 'Tân Binh',
  border TEXT DEFAULT 'border-white',
  equipped_item TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
-- Allow anyone to read profiles (needed for community Leaderboard & Boss fights)
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

-- Allow users to update only their own profile
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Allow users to insert their own profile (or handled via trigger)
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);


-- 2. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Vừa' CHECK (difficulty IN ('Dễ', 'Vừa', 'Khó')),
  tag TEXT DEFAULT 'Học tập',
  deadline TIMESTAMPTZ,
  type TEXT DEFAULT 'one-time',
  completed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'history')),
  penalty_applied BOOLEAN DEFAULT false,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user query
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Enable RLS on Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks Policies: Strictly Isolated by user_id
CREATE POLICY "Users can view their own tasks" 
  ON public.tasks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks" 
  ON public.tasks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" 
  ON public.tasks FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" 
  ON public.tasks FOR DELETE 
  USING (auth.uid() = user_id);


-- 3. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user inventory query
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);

-- Enable RLS on Inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory" 
  ON public.inventory FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to their own inventory" 
  ON public.inventory FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own inventory" 
  ON public.inventory FOR DELETE 
  USING (auth.uid() = user_id);


-- 4. WORLD BOSS TABLE
CREATE TABLE IF NOT EXISTS public.world_boss (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Rồng Hắc Ám Ignis',
  hp INT NOT NULL DEFAULT 5000 CHECK (hp >= 0),
  max_hp INT NOT NULL DEFAULT 5000 CHECK (max_hp > 0),
  reward_claimed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on World Boss
ALTER TABLE public.world_boss ENABLE ROW LEVEL SECURITY;

CREATE POLICY "World boss is viewable by everyone" 
  ON public.world_boss FOR SELECT 
  USING (true);

-- Insert initial World Boss if none exists
INSERT INTO public.world_boss (name, hp, max_hp)
SELECT 'Rồng Hắc Ám Ignis', 5000, 5000
WHERE NOT EXISTS (SELECT 1 FROM public.world_boss);


-- 5. SECURE RPC: ATOMIC BOSS ATTACK (Chống race condition)
CREATE OR REPLACE FUNCTION attack_world_boss(damage_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_hp INT;
  boss_id UUID;
BEGIN
  SELECT id, hp INTO boss_id, current_hp FROM public.world_boss LIMIT 1 FOR UPDATE;
  
  IF boss_id IS NULL THEN
    RETURN 0;
  END IF;

  IF current_hp > 0 THEN
    UPDATE public.world_boss 
    SET hp = GREATEST(0, current_hp - damage_amount),
        updated_at = NOW()
    WHERE id = boss_id;
    RETURN GREATEST(0, current_hp - damage_amount);
  END IF;

  RETURN 0;
END;
$$;


-- 6. AUTH TRIGGER: AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  initial_username TEXT;
BEGIN
  initial_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, username, email, level, exp, hp, gold, streak, title)
  VALUES (
    NEW.id,
    initial_username,
    NEW.email,
    1,
    0,
    100,
    50,
    0,
    'Tân Binh'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
