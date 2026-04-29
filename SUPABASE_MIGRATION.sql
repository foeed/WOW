-- ============================================================================
-- WOW Aviator Rocket - Supabase Database Schema
-- Project Ref: bqvcicfcxlsbwldfghqs
-- ============================================================================
-- HOW TO USE:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to SQL Editor → New Query
-- 4. Copy all content below
-- 5. Paste into SQL Editor
-- 6. Click "Run"
-- 7. Check Table Editor to verify tables were created
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE - Player accounts and stats
-- ============================================================================
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

-- ============================================================================
-- GAMES TABLE - Game round history
-- ============================================================================
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

-- ============================================================================
-- TRANSACTIONS TABLE - Audit trail for deposits/withdrawals
-- ============================================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'wager', 'payout')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  related_game_id UUID REFERENCES public.games(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LEADERBOARD VIEW - Top 100 players by balance
-- ============================================================================
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Data access control
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert own profile (first sign-in)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can view own games
CREATE POLICY "Users can view own games" ON public.games
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create own games
CREATE POLICY "Users can insert own games" ON public.games
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES - Performance optimization
-- ============================================================================

CREATE INDEX idx_games_user_id ON public.games(user_id);
CREATE INDEX idx_games_created_at ON public.games(created_at DESC);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_users_balance ON public.users(balance DESC);

-- ============================================================================
-- COMPLETE! 
-- Tables: users, games, transactions, leaderboard (view)
-- Policies: Row-level security enabled
-- Ready to use!
-- ============================================================================
