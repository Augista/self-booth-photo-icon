# Photobooth iPad App - Panduan Deployment & Setup

## ⚡ Quick Start

### 1. iPad Setup (Frontend)
```bash
# Clone/download project
cd photobooth-app

# Install dependencies
pnpm install

# Update .env.local dengan IP laptop Anda
NEXT_PUBLIC_BACKEND_URL=http://192.168.1.100:5000

# Start dev server
pnpm dev

# Atau build untuk production
pnpm build
pnpm start
```

### 2. Laptop Setup (Backend)
```bash
# Buka terminal baru
cd backend

# Install dependencies
npm install

# Setup .env file
cp .env.example .env
# Edit .env dan isi QRIS_STRING, SUPABASE_URL, SUPABASE_KEY, dll

# Start backend server
node server.js

# Server akan berjalan di http://localhost:5000
```

---

## 📱 iPad Configuration

### Environment Variables (.env.local)

```
NEXT_PUBLIC_BACKEND_URL=http://192.168.1.100:5000
```

**Catatan:**
- Ganti `192.168.1.100` dengan IP actual laptop Anda
- Pastikan iPad dan Laptop di network yang sama
- Cek: Dari iPad, buka browser ke `http://192.168.1.100:5000/health` - harus return `ok`

### iPad Viewport Settings

Aplikasi sudah dioptimasi untuk iPad Air 2:
- Fullscreen layout (no address bar)
- Touch targets: minimum 44px (recommended)
- Font size: minimum 24px
- No horizontal scroll
- Minimal animations

**Untuk kenyamanan maksimal:**
1. Buka di Safari
2. Tap Share → Add to Home Screen (jadikan web app)
3. Gunakan dalam fullscreen mode

---

## 🖥️ Laptop Backend Configuration

### Environment Variables (.env)

```
# Express Server
PORT=5000
NODE_ENV=production

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx

# QRIS (dari bank Anda)
QRIS_STRING=00020126360014...

# Polling interval (ms)
POLL_INTERVAL=2000

# Session timeout
SESSION_TIMEOUT=3600000

# Debug mode (true/false)
DEBUG=false
```

### Mendapatkan Supabase Credentials

1. Buka https://supabase.com
2. Login/Sign up
3. Create new project
4. Di Project Settings → API Keys:
   - Copy `SUPABASE_URL`
   - Copy `anon` key sebagai `SUPABASE_KEY`

### Setup Database Schema

Backend akan auto-create tables saat pertama kali startup:
```javascript
// Tables yang akan dibuat:
- sessions (id, layout, status, created_at, updated_at)
- payments (id, session_id, amount, qris_string, status, paid_at)
- results (id, session_id, image_url, layout_used, created_at)
```

### Mendapatkan Static QRIS

1. **Via Bank (Recommended):**
   - Daftar ke bank yang support QRIS (BRI, BCA, Mandiri, dll)
   - Request "Static QRIS" untuk merchant Anda
   - QRIS string format: `00020126360014...` (panjang bervariasi)

2. **Via Payment Provider:**
   - Midtrans, XENDIT, Doku, atau provider lokal lainnya
   - Request credentials dan static QRIS

3. **Testing:**
   - Gunakan dummy QRIS: `00020126300007ID.CO.BRI.WWW0129HUMB4B5E0E0123456789012300091700000000000001230520245212012103061170403072010K15A0000040000E0102170001` (contoh saja)

---

## 🔧 Troubleshooting

### iPad tidak bisa connect ke backend
```
Error: Failed to fetch at useSession

Solusi:
1. Cek IP laptop di network (cmd/terminal: ipconfig atau ifconfig)
2. Update NEXT_PUBLIC_BACKEND_URL di .env.local dengan IP yang benar
3. Restart frontend dev server
4. Test dari browser: http://[IP]:5000/health
```

### Backend tidak start
```
Error: EADDRINUSE: address already in use :::5000

Solusi:
1. Kill process yang pakai port 5000: lsof -i :5000 (Mac/Linux) atau netstat -ano | findstr :5000 (Windows)
2. Atau ubah PORT di .env menjadi nomor lain (5001, 5002, dll)
```

### QRIS tidak generate
```
Error: Failed to generate QRIS

Solusi:
1. Pastikan QRIS_STRING di .env valid (check dengan provider)
2. Pastikan format string benar (dimulai 000201263...)
3. Test: curl http://localhost:5000/api/payment/test-qris
```

### Polling timeout
```
Error: Polling timeout atau session stuck

Solusi:
1. Check POLL_INTERVAL di backend .env (default 2000ms)
2. Check network latency (iPad ↔ Laptop)
3. Cek log di backend: pastikan tidak ada error saat polling
4. Restart backend: node server.js
```

---

## 📊 Performance Tips

### Untuk iPad Air 2 (spec rendah):
1. **Disable Debug Mode**
   - Set `DEBUG=false` di backend .env
   - Kurangi console.log di production

2. **Optimize Images**
   - Preview: max 480p (done by backend)
   - Compress sebelum upload ke Supabase (gunakan ImageMagick atau Sharp)

3. **Reduce API Calls**
   - Current polling: 2-3 detik (sudah optimal)
   - Jangan lebih sering dari 2 detik

4. **Browser Cache**
   - Safari auto-cache. Untuk clear cache:
     - Settings → Safari → Clear History and Website Data

5. **Network**
   - Gunakan WiFi 2.4GHz (lebih stabil dari 5GHz untuk jarak jauh)
   - Pastikan signal minimal 3 bar

---

## 🚀 Production Deployment

### Option 1: Vercel (Frontend) + DigitalOcean/AWS (Backend)

#### Frontend ke Vercel:
```bash
# Login
npx vercel login

# Deploy
npx vercel

# Update .env.production:
NEXT_PUBLIC_BACKEND_URL=https://photobooth-backend.example.com
```

#### Backend ke DigitalOcean (Recommended):
1. Create Droplet (Ubuntu 22.04, 2GB RAM cukup)
2. SSH ke droplet
3. Install Node.js:
   ```bash
   curl https://deb.nodesource.com/setup_18.x | sudo bash
   sudo apt-get install -y nodejs
   ```
4. Clone project:
   ```bash
   git clone <repo>
   cd backend
   npm install
   ```
5. Setup PM2 untuk auto-restart:
   ```bash
   sudo npm i -g pm2
   pm2 start server.js --name photobooth
   pm2 startup
   pm2 save
   ```
6. Setup Nginx sebagai reverse proxy:
   ```nginx
   server {
     listen 80;
     server_name photobooth-backend.example.com;
     
     location / {
       proxy_pass http://localhost:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

### Option 2: Docker Deployment

#### Backend Dockerfile:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

#### Build & Run:
```bash
docker build -t photobooth-backend .
docker run -p 5000:5000 --env-file .env photobooth-backend
```

---

## 🎯 Quality Checklist

Sebelum production:
- [ ] Backend .env sudah di-set dengan benar
- [ ] Supabase schema sudah created
- [ ] QRIS string sudah valid
- [ ] iPad dan laptop bisa saling ping
- [ ] Frontend dev server berjalan smooth
- [ ] Backend server berjalan smooth
- [ ] Test full flow: Start → Layout → Payment → Camera → Result
- [ ] Test auto-reset setelah result
- [ ] Test error handling (offline, timeout)
- [ ] Performance test di actual iPad Air 2

---

## 📞 Support & Next Steps

Jika ada issues:

1. **Check logs:**
   ```bash
   # Frontend
   pnpm dev # lihat console output
   
   # Backend
   node server.js # lihat console output (set DEBUG=true untuk more details)
   ```

2. **Test endpoints:**
   ```bash
   curl http://localhost:5000/health
   curl http://localhost:5000/api/session/create
   ```

3. **Network test:**
   ```bash
   # Dari iPad, test dengan curl atau Postman
   curl http://[laptop-ip]:5000/health
   ```

---

## 📚 Additional Resources

- QRIS Spec: https://www.bi.go.id/id/
- Supabase Docs: https://supabase.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Node.js Best Practices: https://nodejs.org/en/docs/guides/

---

**Last Updated:** May 2026
**Version:** 1.0.0
