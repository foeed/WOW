# 🚀 WOW Aviator Rocket - v1.0

A full-stack multiplayer crash game built with **Next.js**, **Nest.js**, **Supabase**, and **Vercel**. Players create accounts via OTP, place wagers, and try to cash out before the rocket crashes.

## ✨ Features

- **🎮 Crash Game Mechanics**: Real-time multiplier with auto-crash simulation
- **🔐 OTP Authentication**: Email or phone-based sign-in via Supabase
- **📸 OCR Scanner**: Free client-side OCR using Tesseract.js + optional OCR.space backend
- **🏆 Leaderboard**: Top 100 players by balance
- **📊 Player Stats**: Balance, games played, win rate, profit/loss tracking
- **⚡ Monorepo Setup**: Unified workspace for web and API
- **🚀 Vercel Ready**: One-click deployment for both frontend and backend

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tesseract.js
- **Backend**: Nest.js 10, TypeScript
- **Database**: Supabase (PostgreSQL + Auth + Real-time)
- **Deployment**: Vercel
- **OCR**: Tesseract.js (free client-side) + OCR.space (free API)

## 📋 Prerequisites

- Node.js 18+
- `npm` or `yarn`
- Supabase account (free at https://supabase.com)
- GitHub account (for Vercel deployment)

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd WOW
npm install
```

### 2. Set Up Supabase

1. Create a free project at https://supabase.com
2. Go to **SQL Editor** and run the migration:
   - Copy entire SQL from `supabase/migrations/001_init_game_schema.sql`
   - Execute in Supabase SQL Editor
3. Enable **Email** authentication in **Authentication** → **Providers**

### 3. Configure Environment

**apps/web/.env.local**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3333
```

**apps/api/.env**:

```env
PORT=3333
NODE_ENV=development
```

### 4. Run Locally

```bash
# Terminal 1: Frontend
npm run dev:web

# Terminal 2: Backend
npm run dev:api
```

Visit http://localhost:3000

## 📦 Project Structure

```
WOW/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── lib/             # Utils & API calls
│   │   ├── types/           # TypeScript types
│   │   └── .env.local       # Environment vars
│   │
│   └── api/                 # Nest.js backend
│       ├── src/
│       │   ├── game/        # Game service & controller
│       │   ├── ocr/         # OCR service
│       │   └── main.ts      # Bootstrap
│       └── .env             # Environment vars
│
├── supabase/
│   └── migrations/          # Database schemas
│
└── ENVIRONMENT.md           # Detailed setup guide
```

## 🎮 How to Play

1. **Sign Up**: Email or phone OTP
2. **Place Wager**: Min $0.10 (simulated)
3. **Watch Multiplier**: Increases until crash
4. **Cash Out**: Click before crash to win
5. **View Stats**: Track wins, balance, and leaderboard position

## 🔑 API Endpoints

### Game Routes

- `POST /game/start` - Start a new round
- `POST /game/cashout` - Cash out current round
- `GET /game/state/:gameId` - Get game state
- `GET /game/leaderboard` - Get top 100 players
- `GET /game/stats/:userId` - Get user stats

### OCR Routes

- `POST /ocr` - Send image for OCR processing

## 🚀 Deploy to Vercel

### Frontend

```bash
vercel --prod
# Select: apps/web
# Environment: Add Supabase keys
```

### Backend

```bash
cd apps/api
vercel --prod
# Environment: Add Supabase keys + PORT
```

Or link your GitHub repo to Vercel for automatic deployments.

## 💰 Pricing Breakdown

| Service | Free Tier | Cost |
|---------|-----------|------|
| Supabase | 500MB DB, Unlimited Auth | $25/mo (plus) |
| Vercel | 100GB bandwidth, 6K build min | $10/mo (plus) |
| Tesseract.js | Unlimited | Free |
| OCR.space | 25K requests/day | Free |

**Total Monthly Cost**: ~$0 (free tier) → $35/mo (production)

## 📖 Documentation

- [Environment Setup](./ENVIRONMENT.md) - Detailed configuration guide
- [Supabase Migrations](./supabase/migrations/) - Database schema
- [Game Service](./apps/api/src/game/) - Backend game logic
- [Components](./apps/web/components/) - React components

## 🔄 Development

### Build

```bash
npm run build:web   # Next.js build
npm run build:api   # Nest.js build
```

### Format Code

```bash
npm run format      # Prettier formatting
```

## 🛠️ Troubleshooting

### Supabase Connection Error

- Verify `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check that Supabase project is active

### OTP Not Working

- Ensure **Email** provider is enabled in Supabase
- Check spam folder for OTP emails

### API Connection Error

- Verify Nest.js is running on port 3333
- Check `NEXT_PUBLIC_API_URL` matches your API server

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Fork, create a branch, and submit a PR.

---

**Ready to play?** Run `npm install && npm run dev:web` to get started! 🚀

