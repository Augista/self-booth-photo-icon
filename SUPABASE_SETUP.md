# Panduan Setup Supabase untuk Photobooth App

## 1. Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) dan login
2. Klik "New Project"
3. Isi project details:
   - **Project Name**: `photobooth` (atau nama lain)
   - **Database Password**: Buat password yang kuat
   - **Region**: Pilih region terdekat (misal Singapore untuk Asia)
4. Tunggu project selesai dibuat (~2 menit)

## 2. Setup Database Schema

1. Buka project Supabase Anda
2. Pergi ke **SQL Editor** di sidebar
3. Klik **New Query** dan copy-paste SQL berikut:

```sql
-- Create photobooth_sessions table
CREATE TABLE public.photobooth_sessions (
  id VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  layout VARCHAR(50),
  status VARCHAR(50) DEFAULT 'waiting',
  qris_string TEXT,
  transaction_id VARCHAR(255),
  payment_verified BOOLEAN DEFAULT false,
  photo_path TEXT,
  camera_trigger_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payment_records table
CREATE TABLE public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) REFERENCES public.photobooth_sessions(id),
  amount DECIMAL(10, 2),
  qris_string TEXT,
  transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create photo_results table
CREATE TABLE public.photo_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) REFERENCES public.photobooth_sessions(id),
  layout VARCHAR(50),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes untuk performance
CREATE INDEX idx_sessions_status ON public.photobooth_sessions(status);
CREATE INDEX idx_sessions_created_at ON public.photobooth_sessions(created_at);
CREATE INDEX idx_payments_session_id ON public.payment_records(session_id);
CREATE INDEX idx_payments_transaction_id ON public.payment_records(transaction_id);
CREATE INDEX idx_results_session_id ON public.photo_results(session_id);
```

4. Klik "Run" untuk execute query
5. Tunggu sampai berhasil

## 3. Get Credentials

1. Pergi ke **Project Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Update Environment Variables

Update `.env.local` dengan:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 5. Optional: Row Level Security (RLS)

Untuk production, enable RLS di Supabase:

1. Buka **Authentication** → **Policies**
2. Enable RLS untuk setiap table
3. Create policies untuk public access (atau custom sesuai kebutuhan)

Untuk development, RLS bisa di-disable dulu.

## 6. Testing

1. Run dev server: `pnpm dev`
2. Buka `http://localhost:3000`
3. Test semua flow (create session, select layout, payment, camera, result)
4. Check Supabase dashboard → **Data** untuk verify data tercipta

## Troubleshooting

**Error: "Cannot find module '@supabase/supabase-js'"**
- Run: `pnpm add @supabase/supabase-js`

**Error: "Supabase URL or key is missing"**
- Check `.env.local` file
- Verify values dari Supabase dashboard
- Restart dev server: `pnpm dev`

**Error: "Cannot POST /api/session/create"**
- Check Supabase connection dari API routes
- Verify tables exist di Supabase dashboard
- Check browser console untuk error details

**Payment verification tidak working**
- Dalam `.env.local`, sesuaikan dengan payment provider Anda (BNI, BRI, dsb)
- TODO: Integrate dengan actual QRIS provider

## Production Deployment ke Vercel

1. Push code ke GitHub
2. Buka [vercel.com](https://vercel.com)
3. Import project dari GitHub
4. Setup Environment Variables di Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

Aplikasi akan berjalan di `https://your-project.vercel.app`
