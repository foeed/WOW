# Environment Setup Guide

## Local Development

### 1. Next.js Frontend (apps/web)

Create `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://wow-1.vercel.app
NEXT_PUBLIC_API_URL=http://localhost:3333

# Optional: OCR (for backend OCR endpoint)
OCR_SPACE_API_KEY=your-ocr-api-key
```

### 2. Nest.js Backend (apps/api)

Create `.env`:

```env
# Server
PORT=3333
NODE_ENV=development

# Optional: OCR.space API
OCR_SPACE_API_KEY=your-ocr-api-key

# Database (when connected to Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Supabase Setup

1. Create a project at https://supabase.com
2. Go to **Settings** → **API** to get:
   - Project URL
   - Anon Key
   - Service Role Key

3. Run the SQL migration in `supabase/migrations/001_init_game_schema.sql`:
   - Open SQL Editor in Supabase
   - Paste the entire SQL file
   - Execute

4. Enable Authentication:
   - Go to **Authentication** → **Providers**
   - Enable "Email"
   - Enable "Phone" (optional)

## Vercel Deployment

### Web Frontend

1. Push code to GitHub
2. Create a new project at vercel.com
3. Select the GitHub repo
4. Framework: Next.js
5. Root Directory: `apps/web`
6. Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-value
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-value
   NEXT_PUBLIC_API_URL=https://your-api.vercel.app
   ```

### API Backend

1. Create another Vercel project for the Nest.js API
2. Root Directory: `apps/api`
3. Build Command: `npm run build`
4. Start Command: `npm run start:prod`
5. Environment Variables:
   ```
   PORT=3000
   SUPABASE_URL=your-value
   SUPABASE_ANON_KEY=your-value
   SUPABASE_SERVICE_ROLE_KEY=your-value
   OCR_SPACE_API_KEY=your-value (optional)
   ```

## Free Tier Services

### Supabase (Free)
- Database: 500MB
- Auth Users: Unlimited
- Real-time: 2GB/month

### Vercel (Free)
- Deployments: Unlimited
- Bandwidth: 100GB/month
- Build execution: 6,000 build minutes/month

### OCR.space (Free)
- 25,000 requests/day
- No API key required for free tier
- 45 recognize requests/day with API key

### Tesseract.js (Free)
- Integrated directly in browser
- No API calls needed
- Runs client-side for privacy

## Running Locally

```bash
# Install
npm install

# Development
npm run dev:web    # http://localhost:3000
npm run dev:api    # http://localhost:3333

# Production Build
npm run build:web
npm run build:api

# Start Production
npm run start:web
npm run start:api
```

## Troubleshooting

### Supabase Connection Issues
- Verify environment variables are set correctly
- Check that Supabase project is active
- Ensure database migrations were run

### OTP Not Sending
- Check Supabase email/SMS provider settings
- Verify user email/phone is in correct format
- Check spam folder for emails

### Game API Errors
- Ensure Nest API is running on correct port
- Check NEXT_PUBLIC_API_URL matches API server URL
- Verify CORS is properly configured
