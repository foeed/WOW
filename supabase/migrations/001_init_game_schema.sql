BEGIN;

-- UUID helpers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 100.00 CHECK (balance >= 0),
  total_wagered DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (total_wagered >= 0),
  total_won DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (total_won >= 0),
  games_played INT NOT NULL DEFAULT 0 CHECK (games_played >= 0),
  win_rate DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (win_rate >= 0 AND win_rate <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Game sessions
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wager DECIMAL(10, 2) NOT NULL CHECK (wager > 0),
  multiplier DECIMAL(8, 2),
  crash_at DECIMAL(8, 2) NOT NULL CHECK (crash_at >= 1),
  cash_out_at DECIMAL(8, 2),
  result TEXT NOT NULL CHECK (result IN ('won', 'lost', 'pending')),
  payout DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (payout >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Transactions (deposits/withdrawals)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'wager', 'payout')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  related_game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_games_user_id_created_at ON public.games (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_created_at ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_balance_desc ON public.users (balance DESC);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile row when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Leaderboard view
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  u.id,
  u.username,
  u.balance,
  u.total_wagered,
  u.total_won,
  u.games_played,
  u.win_rate,
  ROW_NUMBER() OVER (ORDER BY u.balance DESC, u.total_won DESC, u.created_at ASC) AS rank
FROM public.users u
ORDER BY u.balance DESC, u.total_won DESC, u.created_at ASC
LIMIT 100;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Recreate policies safely
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own games" ON public.games;
CREATE POLICY "Users can view own games" ON public.games
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own games" ON public.games;
CREATE POLICY "Users can insert own games" ON public.games
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own games" ON public.games;
CREATE POLICY "Users can update own games" ON public.games
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public leaderboard is readable by all API roles
GRANT SELECT ON public.leaderboard TO anon, authenticated;

COMMIT;
