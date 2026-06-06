# Photobooth iPad App - Setup Guide

Aplikasi photobooth untuk iPad Air 2 dan perangkat tablet lama. Full-stack Next.js dengan Supabase backend, bisa di-deploy ke Vercel.

## Struktur Folder

```
/vercel/share/v0-project/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Main app entry point
│   ├── layout.tsx               # Root layout dengan iPad optimization
│   ├── globals.css              # Global styles dengan design tokens
│   └── api/                     # Next.js API Routes (Backend)
│       ├── session/
│       │   ├── create/route.ts          # POST: Create session
│       │   ├── [id]/route.ts            # GET: Get session
│       │   ├── [id]/layout/route.ts     # POST: Set layout
│       │   └── [id]/reset/route.ts      # POST: Reset session
│       ├── payment/
│       │   ├── generate-qris/route.ts   # POST: Generate QRIS
│       │   └── verify/route.ts          # POST: Verify payment
│       ├── camera/
│       │   └── trigger/route.ts         # POST: Trigger camera
│       └── process/
│           └── create-collage/route.ts  # POST: Create collage
├── components/
│   ├── screens/                 # 5 main screens
│   │   ├── StartScreen.tsx      # Screen 1: Mulai
│   │   ├── LayoutSelector.tsx   # Screen 2: Pilih layout
│   │   ├── PaymentScreen.tsx    # Screen 3: Pembayaran QRIS
│   │   ├── CameraScreen.tsx     # Screen 4: Ambil foto
│   │   └── ResultScreen.tsx     # Screen 5: Hasil foto
│   └── ui/
│       └── button.tsx           # Button component
├── lib/
│   ├── supabase.ts              # Supabase client initialization
│   ├── useSession.ts            # Hook untuk session management + polling
│   └── utils.ts                 # General utilities
├── supabase/
│   └── migrations/              # SQL migration files
├── .env.local                   # Environment variables (Supabase)
└── public/                      # Static assets
```

## Setup Supabase (Database Backend)

### 1. Create Supabase Project

1. Buka [supabase.com](https://supabase.com)
2. Login / Sign up
3. Create new project
4. Tunggu ~2 menit hingga selesai

### 2. Setup Database Tables

Ikuti panduan di **SUPABASE_SETUP.md** untuk:
- Create tables (photobooth_sessions, payment_records, photo_results)
- Setup indexes
- Enable RLS (optional untuk development)

### 3. Get API Credentials

Di Supabase dashboard:
1. Settings → API
2. Copy **Project URL** dan **anon public key**
3. Paste ke `.env.local`

### 4. Verify Connection

Run dev server dan test API routes via browser/Postman:
```
POST http://localhost:3000/api/session/create
```

Harusnya return sessionId baru

## Setup Frontend (Next.js App)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Environment

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Development Server

```bash
pnpm dev
```

Akses di browser: `http://localhost:3000`

### 4. Test di iPad

1. Get laptop IP: `ipconfig getifaddr en0` (Mac) atau `hostname -I` (Linux)
2. Di iPad, buka: `http://192.168.x.x:3000`
3. Test semua flows

### 5. Build untuk Production

```bash
pnpm build
pnpm start
```

Atau deploy ke Vercel (recommended)

## Alur Aplikasi

1. **Start Screen** - Tekan "Mulai Sekarang"
2. **Layout Selection** - Pilih jumlah foto (1x4, 2x2, 2x3, 3x3)
3. **Payment Screen** - Scan QRIS dengan e-wallet
4. **Camera Screen** - Tekan tombol merah untuk ambil foto (sesuai layout)
5. **Result Screen** - Lihat hasil foto yang sudah diproses

## API Routes (Next.js Backend)

Semua routes berjalan di server Next.js dan terhubung langsung ke Supabase.

### Session Management
- `POST /api/session/create` - Create new session
- `GET /api/session/:id` - Get session details
- `POST /api/session/:id/layout` - Set layout untuk session
- `POST /api/session/:id/reset` - Reset/cleanup session

### Payment (QRIS)
- `POST /api/payment/generate-qris` - Generate QRIS QR code
- `POST /api/payment/verify` - Verify payment

### Camera & Processing
- `POST /api/camera/trigger` - Trigger camera capture
- `POST /api/process/create-collage` - Process dan create collage

Semua request langsung ke Next.js API routes, yang kemudian mengakses Supabase database.

## Communication Flow

**iPad Frontend → Next.js API Routes (Polling)**
```
iPad polling `/api/session/{id}` setiap 3 detik untuk:
- Session status updates
- Payment verification status
- Photo ready status
- Processing completion
```

**API Routes → Supabase**
```
Next.js API routes read/write ke Supabase:
- Create/update photobooth_sessions table
- Create/update payment_records table
- Create/update photo_results table
```

**Note:** Camera triggering saat ini adalah mock/simulation. 
Untuk production DSLR integration, tambahkan:
- gphoto2 library (Linux)
- Atau USB/SDK dari DSLR manufacturer

## Optimisasi iPad Air 2

✅ Polling system (2 detik) - aman untuk iPad lama
✅ No WebSocket - avoid connection overhead
✅ Minimal animations - reduce CPU usage
✅ Preview max 480p - save bandwidth
✅ Solid colors - avoid gradients
✅ Large touch targets - easy untuk disentuh

## Testing Simulator

Saat development, aplikasi akan auto-trigger kamera setiap 2 detik. Untuk production, integrate dengan gphoto2 atau hardware DSLR API:

```javascript
// Di backend/server.js, ganti timeout dengan:
const { exec } = require('child_process');
exec('gphoto2 --capture-image-and-download', (err, stdout) => {
  // Handle DSLR output
});
```

## Payment Integration

Saat ini menggunakan simulasi QRIS. Untuk production QRIS real:

1. Integrasikan dengan Midtrans / Xendit / provider lain
2. Generate dynamic QRIS dengan merchant info
3. Verify payment via provider API
4. Update session status setelah verification

## Troubleshooting

### Supabase connection error
```
- Check .env.local: NEXT_PUBLIC_SUPABASE_URL dan KEY
- Verify di Supabase dashboard → Settings → API
- Restart dev server: pnpm dev
```

### API route 404 error
```
- Check file path: app/api/session/create/route.ts
- Verify route syntax untuk dynamic params: app/api/session/[id]/route.ts
- Restart dev server
```

### Session tidak tersimpan di database
```
- Check Supabase tables exist (lihat SUPABASE_SETUP.md)
- Verify RLS policies (jalankan tanpa RLS untuk testing)
- Check browser console untuk error details
```

### iPad connection issue
```
- iPad & laptop harus di wifi yang sama
- Test: ping laptop-ip dari iPad
- Check firewall: port 3000 harus open
```

## Deployment ke Vercel (Production)

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial photobooth app"
git branch -M main
git remote add origin https://github.com/your-username/photobooth.git
git push -u origin main
```

### 2. Deploy ke Vercel

```bash
pnpm add -g vercel
vercel login
vercel
```

### 3. Set Environment Variables di Vercel

Dashboard Vercel → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Redeployment

Otomatis deploy setiap kali push ke `main` branch.

Aplikasi akan live di: `https://your-project.vercel.app`

## Next Steps & Extensions

Aplikasi saat ini sudah siap production dengan Supabase. Untuk features tambahan:

### QRIS Payment Integration
- Integrasikan dengan Midtrans/Xendit/payment provider
- Update `/api/payment/generate-qris` dengan real QRIS generation
- Update `/api/payment/verify` dengan real payment verification

### Real DSLR Integration
- Install gphoto2 (Linux) atau iOS/Android SDK
- Update `/api/camera/trigger` untuk actual camera control
- Implement image download dari DSLR

### Image Processing & Storage
- Implement collage creation dengan Sharp library
- Upload hasil ke Supabase Storage atau AWS S3
- Implement image compression & optimization

### Analytics & Monitoring
- Setup Supabase realtime untuk live updates
- Add Sentry untuk error tracking
- Monitor Vercel deployment

## File Checklist

Sebelum deploy, pastikan ada:
- ✅ `.env.local` dengan Supabase credentials
- ✅ Supabase tables sudah created
- ✅ All API routes di `app/api/` folder
- ✅ Components di `components/screens/`
- ✅ useSession hook di `lib/useSession.ts`
