# 🔗 Supabase Connection & Migration Guide

## Your Project Details

```
Project Reference: bqvcicfcxlsbwldfghqs
Status: Ready to connect
```

---

## ✅ Method 1: Via Supabase Dashboard (Recommended - No CLI needed)

### Step 1: Access Supabase Console
1. Go to https://supabase.com/dashboard
2. Sign in with your account
3. Select project: `bqvcicfcxlsbwldfghqs`

### Step 2: Copy Environment Variables

In your project dashboard:
1. Click **Settings** → **API**
2. Copy these values:

```
🔑 API URL (NEXT_PUBLIC_SUPABASE_URL)
📝 anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
🔐 service_role key (SUPABASE_SERVICE_ROLE_KEY)
```

### Step 3: Update Environment Files

**File: `/workspaces/WOW/apps/web/.env.local`**
```env
NEXT_PUBLIC_SUPABASE_URL=your-api-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3333
```

**File: `/workspaces/WOW/apps/api/.env`**
```env
PORT=3333
NODE_ENV=development
SUPABASE_URL=your-api-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 4: Run SQL Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy entire content from: `/workspaces/WOW/supabase/migrations/001_init_game_schema.sql`
4. Paste into SQL Editor
5. Click **Run** button

### Step 5: Verify Tables Created

After SQL executes:
1. Go to **Table Editor** in Supabase
2. Verify these tables appear:
   - ✅ `users`
   - ✅ `games`
   - ✅ `transactions`

---

## 📝 SQL Migration Content

Here's what will be created:

```sql
-- Users table (player accounts)
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  balance DECIMAL(10, 2) DEFAULT 100.00,
  total_wagered DECIMAL(12, 2) DEFAULT 0,
  total_won DECIMAL(12, 2) DEFAULT 0,
  games_played INT DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Games table (round history)
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  wager DECIMAL(10, 2) NOT NULL,
  multiplier DECIMAL(8, 2),
  crash_at DECIMAL(8, 2) NOT NULL,
  cash_out_at DECIMAL(8, 2),
  result TEXT NOT NULL,
  payout DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

-- Transactions table (audit trail)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  related_game_id UUID REFERENCES public.games(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboard view (top 100 players)
CREATE VIEW public.leaderboard AS
SELECT 
  u.id, u.username, u.balance,
  u.total_wagered, u.total_won,
  u.games_played, u.win_rate,
  ROW_NUMBER() OVER (ORDER BY u.balance DESC) as rank
FROM public.users u
ORDER BY u.balance DESC
LIMIT 100;

-- Row-level security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

---

## ✅ Method 2: CLI Commands (If CLI installed)

Once Supabase CLI is available:

```bash
# Link to your project
supabase link --project-ref bqvcicfcxlsbwldfghqs

# Create new migration
supabase migration new init_game_schema

# This creates a new file in supabase/migrations/
# Copy the SQL content into that file
# Then run:

supabase db push
```

---

## 🔐 Enable Authentication

In Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Enable **Email Provider**:
   - Click toggle to ON
   - Keep default settings
3. Enable **Phone Provider** (optional):
   - Click toggle to ON
   - Configure with your phone provider

---

## ✨ Enable Features

In Supabase Dashboard:

1. **Real-time**: SQL Editor → Query → Toggle "Realtime" on
2. **Webhooks**: SQL Editor → RLS Policies → Create triggers
3. **Storage**: Storage → Create bucket for OCR uploads (optional)

---

## 🧪 Test Connection

After setting up `.env.local`, restart frontend:

```bash
cd /workspaces/WOW/apps/web
npm run dev
```

Visit http://localhost:3000

Try signing in with your email - you should get OTP email from Supabase!

---

## ✅ Verification Checklist

After following steps above:

- [ ] Environment variables copied to `.env.local`
- [ ] SQL migration executed
- [ ] Tables visible in Supabase
- [ ] Email authentication enabled
- [ ] Can sign in with OTP

---

## 🚨 Troubleshooting

### "Cannot find SUPABASE_URL"
- Check `.env.local` has correct URL
- Files must be in `apps/web/`, not root

### "Auth provider not found"
- Enable Email provider in Authentication settings
- Wait 1-2 minutes for changes to sync

### "Table does not exist"
- Verify SQL migration ran successfully
- Check **Table Editor** shows new tables
- Try running migration again

### "CORS error in browser"
- Supabase CORS is auto-configured
- Check browser console for exact error
- Verify API URL in `.env.local`

---

## 📞 Need Help?

1. **Supabase Docs**: https://supabase.com/docs
2. **SQL Error**: Check SQL Editor error messages
3. **Auth Issues**: Go to Authentication → Users to see signups

---

## 🎯 What's Next

Once Supabase is connected:

✅ Users can sign in with OTP  
✅ Game rounds are saved to database  
✅ Player stats auto-update  
✅ Leaderboard populates  
✅ Ready to deploy to production  

**Total time**: ~10 minutes

---

**Project Ref**: bqvcicfcxlsbwldfghqs  
**Status**: Ready for connection
