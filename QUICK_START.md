# Photobooth App - Quick Start (5 Menit)

Panduan tercepat untuk start aplikasi dengan Supabase.

## 1. Setup Supabase (1 menit)

```bash
# 1. Buka https://supabase.com → Create Project
# 2. Di Supabase dashboard, buka SQL Editor
# 3. Copy-paste SQL dari SUPABASE_SETUP.md
# 4. Run SQL
```

## 2. Get Credentials (30 detik)

```bash
# Di Supabase: Settings → API
# Copy:
# - Project URL
# - anon public key
```

## 3. Setup Environment (30 detik)

```bash
# Edit .env.local
NEXT_PUBLIC_SUPABASE_URL=<paste-url-here>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-key-here>
```

## 4. Install & Run (2 menit)

```bash
pnpm install
pnpm dev
```

Buka browser: `http://localhost:3000`

## 5. Test Flows

1. Click "Mulai Photobooth"
2. Select layout (1x1, 2x2, 3x3)
3. Generate QRIS
4. Verify payment
5. Trigger camera
6. See results

Done! 🎉

## Untuk Production

Lihat **VERCEL_DEPLOYMENT.md** untuk deploy ke Vercel.

## Troubleshoot

**"Cannot find Supabase tables"?**
- Check SUPABASE_SETUP.md → run SQL di Supabase

**"Env variables missing"?**
- Edit `.env.local` dengan URL dan Key dari Supabase

**"API returns 404"?**
- Restart: `pnpm dev`

**"Preview lag di iPad"?**
- Increase polling interval: `lib/useSession.ts` line 3
- Change `POLL_INTERVAL = 3000` to `5000`

## Full Documentation

- **README_SETUP.md** - Detailed setup guide
- **SUPABASE_SETUP.md** - Database configuration
- **VERCEL_DEPLOYMENT.md** - Production deployment
- **MAINTENANCE.md** - Monitoring & maintenance
