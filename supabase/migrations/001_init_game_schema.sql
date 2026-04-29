-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  balance DECIMAL(10, 2) DEFAULT 100.00,
  total_wagered DECIMAL(12, 2) DEFAULT 0,
  total_won DECIMAL(12, 2) DEFAULT 0,
  games_played INT DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wager DECIMAL(10, 2) NOT NULL,
  multiplier DECIMAL(8, 2),
  crash_at DECIMAL(8, 2) NOT NULL,
  cash_out_at DECIMAL(8, 2),
  result TEXT NOT NULL CHECK (result IN ('won', 'lost', 'pending')),
  payout DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Transactions (deposits/withdrawals)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'wager', 'payout')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  related_game_id UUID REFERENCES public.games(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard view
CREATE VIEW public.leaderboard AS
SELECT 
  u.id,
  u.username,
  u.balance,
  u.total_wagered,
  u.total_won,
  u.games_played,
  u.win_rate,
  ROW_NUMBER() OVER (ORDER BY u.balance DESC) as rank
FROM public.users u
ORDER BY u.balance DESC
LIMIT 100;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own games" ON public.games
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games" ON public.games
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Public leaderboard is readable by all
CREATE POLICY "Leaderboard is readable by all" ON public.leaderboard
  FOR SELECT USING (true);
