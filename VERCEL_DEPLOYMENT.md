# Deployment Photobooth App ke Vercel

Panduan step-by-step untuk deploy aplikasi ke production di Vercel.

## Prerequisites

1. **GitHub Account** - untuk push code
2. **Vercel Account** - [vercel.com](https://vercel.com) (bisa pakai GitHub login)
3. **Supabase Project** - sudah setup (lihat SUPABASE_SETUP.md)
4. **Environment Variables Ready** - Supabase URL dan Key

## Step 1: Prepare Code untuk Production

### 1.1 Update .env.local dengan Supabase credentials

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 1.2 Test di local production mode

```bash
pnpm build
pnpm start
```

Akses `http://localhost:3000` dan test semua flows.

## Step 2: Push ke GitHub

### 2.1 Initialize Git (jika belum)

```bash
git init
git add .
git commit -m "Initial photobooth app ready for production"
```

### 2.2 Create GitHub Repository

1. Buka [github.com/new](https://github.com/new)
2. Create repository dengan nama: `photobooth-app`
3. Copy HTTPS URL

### 2.3 Push ke GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/photobooth-app.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy ke Vercel

### 3.1 Connect Vercel to GitHub

1. Buka [vercel.com](https://vercel.com)
2. Login dengan GitHub account
3. Klik "New Project"
4. Pilih repository "photobooth-app"
5. Klik "Import"

### 3.2 Configure Project Settings

Di Vercel Import screen:

**Framework Preset**: Next.js (auto-detected)
**Root Directory**: ./
**Build Command**: `pnpm build` (default: `next build`)
**Output Directory**: `.next` (default)
**Install Command**: `pnpm install` (default: `npm install`)

Click "Deploy"

### 3.3 Add Environment Variables

1. After deployment started, go to **Settings**
2. Click **Environment Variables**
3. Add:
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
   
4. Add:
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `your-anon-key-here`

5. Click **Save**

### 3.4 Redeploy with Environment Variables

1. Go to **Deployments** tab
2. Click latest deployment's menu (three dots)
3. Click **Redeploy**

Wait for redeployment to complete.

## Step 4: Verify Production Deployment

### 4.1 Test di Production

1. Klik deployment URL (misal: `https://photobooth-app.vercel.app`)
2. Test semua flows:
   - Create session ✓
   - Select layout ✓
   - Generate QRIS ✓
   - Verify payment ✓
   - Trigger camera ✓
   - Create collage ✓
   - Reset session ✓

### 4.2 Check Supabase Database

1. Buka Supabase dashboard
2. Go to **Data** → **photobooth_sessions**
3. Verify rows tercipta saat test di production

## Step 5: Setup Domain (Optional)

### 5.1 Add Custom Domain

1. Di Vercel project settings
2. Go to **Domains**
3. Add custom domain (misal: `photobooth.yoursite.com`)
4. Follow instructions untuk update DNS

### 5.2 Enable HTTPS

Automatic dengan Vercel

## Step 6: Continuous Deployment

### 6.1 Auto-deploy on Push

Setelah initial setup, setiap push ke `main` branch akan auto-deploy ke production.

```bash
# Make changes locally
git add .
git commit -m "Update payment flow"
git push origin main

# Vercel akan auto-deploy dalam ~1 menit
```

### 6.2 Preview Deployments

Setiap pull request akan membuat preview deployment:
1. Buat branch baru: `git checkout -b feature/new-feature`
2. Push: `git push origin feature/new-feature`
3. Create Pull Request di GitHub
4. Vercel akan create preview URL (preview-xyz.vercel.app)
5. Test di preview sebelum merge ke main

## Troubleshooting

### Build Failed - "Cannot find module '@supabase/supabase-js'"

**Solution**: Pastikan `pnpm-lock.yaml` sudah di-commit:
```bash
git add pnpm-lock.yaml
git commit -m "Add lock file"
git push
```

### Build Failed - Environment variables not set

**Solution**: 
1. Go to Vercel Project Settings
2. Environment Variables
3. Add missing vars
4. Redeploy

### Application shows blank page

**Solution**:
1. Open browser DevTools → Console
2. Check untuk error messages
3. Verify Supabase URL & Key correct
4. Check Supabase API keys di [supabase.com](https://supabase.com)

### QRIS not generating / Payment endpoints failing

**Solution**:
1. Check Supabase tables exist
2. Check RLS policies (disable untuk testing)
3. Open Vercel logs: `vercel logs`
4. Check payment table creation dalam SQL

## Monitoring Production

### View Logs

```bash
vercel logs projectName
```

### View Deployments

```bash
vercel list
```

### View Environment

```bash
vercel env list
```

## Rollback if Needed

```bash
vercel rollback
```

## Performance Optimization

### 1. Enable Caching

In `next.config.mjs`:
```js
const nextConfig = {
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache',
        },
      ],
    },
  ],
};
```

### 2. Monitor Performance

Vercel Analytics → Web Vitals

### 3. Optimize Images

Gunakan Next.js Image component:
```jsx
import Image from 'next/image'
<Image src="/photo.jpg" alt="Photo" width={480} height={640} />
```

## Security Checklist

- ✅ Environment variables tidak di-commit (check `.env.local` in `.gitignore`)
- ✅ Supabase RLS enabled untuk production
- ✅ CORS configured (jika ada DSLR integration)
- ✅ Rate limiting implemented (future)
- ✅ HTTPS enabled (automatic dengan Vercel)

## Maintenance

### Regular Backups

Supabase automatic backups di Supabase dashboard.

### Monitor Usage

Vercel → Analytics:
- Function invocations
- Edge requests
- Data transferred

### Update Dependencies

```bash
npm outdated
npm update
git commit -am "Update dependencies"
git push
```

## Support

- **Vercel Issues**: [vercel.com/support](https://vercel.com/support)
- **Supabase Issues**: [supabase.com/support](https://supabase.com/support)
- **Next.js Issues**: [nextjs.org/docs](https://nextjs.org/docs)

## Next Iteration Ideas

1. Add real QRIS payment (Midtrans/Xendit)
2. Add real DSLR integration (gphoto2)
3. Add image upload to Supabase Storage
4. Add analytics dashboard
5. Add SMS/Email notification
