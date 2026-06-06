# Panduan Testing - Photobooth iPad App

## 🧪 Pre-Testing Checklist

### Setup Verification
- [ ] Frontend running: `pnpm dev` (http://localhost:3000)
- [ ] Backend running: `node server.js` (http://localhost:5000)
- [ ] iPad & Laptop di network yang sama
- [ ] .env.local di iPad dengan NEXT_PUBLIC_BACKEND_URL yang benar
- [ ] .env di Backend dengan semua credentials lengkap

### Health Check
```bash
# Terminal 1 - Frontend
cd /project && pnpm dev

# Terminal 2 - Backend
cd /project/backend && node server.js

# Terminal 3 - Test endpoints
curl http://localhost:5000/health
# Expected: {"status":"ok"}

curl http://localhost:5000/api/session/create
# Expected: {"sessionId":"1234...","status":"waiting"}
```

---

## 🎬 User Flow Testing

### Test Case 1: Start Screen
**Objective:** User dapat membuat session baru
**Steps:**
1. Buka iPad di http://localhost:3000 (atau NEXT_PUBLIC_BACKEND_URL)
2. Lihat "Photobooth" title + "Mulai Photobooth" button
3. Klik tombol

**Expected Result:**
- Screen berubah ke layout selection
- Console: `[useSession] Mock session created` atau `[useSession] Session created: xyz123`

**Pass/Fail:** ___

---

### Test Case 2: Layout Selection
**Objective:** User dapat memilih layout
**Steps:**
1. Dari start screen, klik "Mulai Photobooth"
2. Lihat 3 pilihan layout: 1x1, 2x2, 3x3
3. Klik salah satu layout (cth: 2x2)

**Expected Result:**
- Screen berubah ke payment screen
- Console: `[useSession] Mock layout selection` atau `[useSession] Layout set: 2x2`
- Title menunjukkan layout yang dipilih

**Pass/Fail:** ___

---

### Test Case 3: Payment Screen (QRIS)
**Objective:** User lihat QR code dan polling dimulai
**Steps:**
1. Dari layout screen, klik layout (misal 2x2)
2. Lihat payment screen dengan info:
   - "Total: Rp50.000"
   - QR code displayed
   - "Tunggu pembayaran..." status
3. Amati selama 10 detik

**Expected Result:**
- QR code terlihat jelas di iPad
- Console: `[useSession] Mock QRIS generated` atau QR code real dari backend
- Polling berjalan (every 2-3 detik) - cek console

**Pass/Fail:** ___

**Test Pembayaran Real:**
- Manual: Buka simulasi payment di backend (ada endpoint `/api/payment/simulate-payment/:sessionId`)
- Polling akan detect dan auto-move ke camera screen dalam 2-3 detik

---

### Test Case 4: Camera/Preview Screen
**Objective:** User siap capture foto
**Steps:**
1. Dari payment screen, test pembayaran (manual atau simulate)
2. Auto-move ke camera screen
3. Lihat:
   - "Siap Mengambil Foto" title
   - "AMBIL FOTO" button (besar, mudah diklik)
   - Status: "Tunggu Instruksi..."

**Expected Result:**
- Screen layout responsif di iPad
- Button mudah diklik (touch target 44px+)
- Console: `[useSession] Camera screen loaded`

**Pass/Fail:** ___

**Test Capture:**
1. Klik "AMBIL FOTO" button
2. Expected: Mock trigger atau real DSLR trigger via backend
3. Console: `[useSession] Camera triggered`

---

### Test Case 5: Result Screen
**Objective:** User lihat hasil foto
**Steps:**
1. Setelah capture, system process collage (2-3 detik di mock)
2. Auto-move ke result screen
3. Lihat:
   - "Foto Jadi!" title
   - Placeholder image (atau real image jika backend dengan DSLR)
   - "Download" + "Mulai Lagi" buttons

**Expected Result:**
- Result screen tampil dengan clean design
- Buttons terlihat jelas dan mudah diklik
- Console: `[useSession] Result screen loaded`

**Pass/Fail:** ___

**Test Auto-Reset:**
1. Dari result screen, tunggu 15 detik
2. Expected: Auto-back ke start screen dengan reset session

**Pass/Fail:** ___

---

## 🔄 Mock Mode vs Real Backend Testing

### Mock Mode (Default - Tanpa Backend)
Terjadi otomatis jika backend tidak bisa direach:
```
✅ Session created secara mock
✅ Layout selection works
✅ QRIS generated (mock string)
✅ Payment auto-verified
✅ Camera trigger works (mock)
✅ Collage processing works (mock)
✅ Result display works
```

**Testing Tips:**
- Stop backend: `pkill -f "node server.js"`
- Semua fungsi akan auto-fallback ke mock
- Console akan show: `[useSession] Mock [function] ...`

### Real Backend Mode
Jika backend running dan reachable:
```
✅ Real session dengan database
✅ Real QRIS dari library
✅ Real polling dari backend
✅ Real camera integration (perlu DSLR setup)
✅ Real image processing
```

**Testing Tips:**
- Pastikan backend running: `node server.js`
- Check endpoint: `curl http://localhost:5000/health`
- Lihat backend logs untuk detail request

---

## 📱 iPad Air 2 Specific Testing

### Performance Test
**Objective:** App berjalan smooth di iPad Air 2
**Steps:**
1. Buka app di actual iPad Air 2 (atau simulator)
2. Lakukan satu full flow (Start → Layout → Payment → Camera → Result)
3. Amati:
   - Response time setiap action
   - Tidak ada lag saat transition
   - Touch responsiveness bagus
   - Memory usage reasonable

**Pass Criteria:**
- Response < 500ms per action
- No visual stuttering
- Touch immediate response

**Pass/Fail:** ___

### Network Test
**Objective:** App robust terhadap network issues
**Steps:**
1. Setup iPad & Laptop di network yang same
2. Test dengan network kondisi berbeda:
   - **Good Network:** WiFi 5GHz, strong signal
   - **Weak Network:** WiFi 2.4GHz, far away
   - **Intermittent:** Manually disconnect/reconnect WiFi
   - **Timeout:** Mock delay di backend

**Expected Result:**
- Good network: Response immediate
- Weak network: Response slow tapi tetap works
- Intermittent: Polling fallback ke mock
- Timeout: Error message, bisa retry

**Pass/Fail:** ___

### Orientation Test
**Objective:** App works di portrait & landscape
**Steps:**
1. Buka app di iPad
2. Rotate iPad ke berbagai orientation
3. Cek setiap screen (Start, Layout, Payment, Camera, Result)

**Expected Result:**
- All screens terlihat baik di both orientation
- Buttons tidak tertutup
- Text readable
- No horizontal scroll

**Pass/Fail:** ___

---

## 🐛 Error Handling Testing

### Test Case: Backend Offline
**Steps:**
1. App running
2. Stop backend: `pkill -f "node server.js"`
3. Klik "Mulai Photobooth"
4. Amati

**Expected Result:**
- Session created dengan mock mode
- Console warn: `[useSession] Backend tidak tersedia, menggunakan mock mode`
- App continues normally dengan mock data

**Pass/Fail:** ___

### Test Case: Network Timeout
**Steps:**
1. Setup network yang sangat lambat (simulate dengan network throttling di DevTools)
2. Klik "Mulai Photobooth"
3. Amati

**Expected Result:**
- Timeout setelah 5 detik
- App fallback ke mock mode
- Tetap bisa lanjut (bukan stuck)

**Pass/Fail:** ___

### Test Case: Invalid QRIS
**Steps:**
1. Backend .env dengan QRIS_STRING yang invalid
2. Klik layout
3. Lihat payment screen

**Expected Result:**
- Mock QRIS ditampilkan (fallback)
- Atau error message yang jelas
- Bisa retry

**Pass/Fail:** ___

---

## 🔒 Security Testing

### Data Privacy
- [ ] Session ID tidak tersimpan di browser localStorage (check DevTools)
- [ ] QRIS string only shown di iPad, tidak logged
- [ ] Supabase query menggunakan RLS (Row Level Security)

### Payment Security
- [ ] QRIS display hanya di payment screen
- [ ] Payment verification di backend (not client-side)
- [ ] Mock mode tidak perlu payment asli

---

## 📊 Performance Profiling

### Memory Usage (iPad Safari DevTools)
1. Open Safari DevTools on iPad
2. Check Memory tab
3. Before: baseline
4. After full flow: should not exceed 200MB

### Network Calls (DevTools Network Tab)
1. Open Network tab
2. Do full flow
3. Check:
   - Number of requests: < 20
   - Total data: < 5MB
   - Polling requests: every 2-3 sec

### Console Errors
1. Check console (F12 di desktop, or Mac Safari)
2. Should have 0 errors at end
3. OK untuk ada warnings (non-breaking)

---

## ✅ Final Approval Checklist

Sebelum production:
- [ ] All test cases passed
- [ ] No console errors
- [ ] Performance acceptable di iPad Air 2
- [ ] Network handling robust
- [ ] Error messages user-friendly
- [ ] Auto-reset works correctly
- [ ] Full flow completes dalam < 2 minutes
- [ ] Documentation updated

---

## 📝 Test Report Template

```
Testing Date: __________
Tester: __________
Device: iPad Air 2 / Simulator
iOS Version: __________
Network: WiFi / Hotspot

Test Results:
[ ] Start Screen - PASS / FAIL
[ ] Layout Selection - PASS / FAIL
[ ] Payment Screen - PASS / FAIL
[ ] Camera Screen - PASS / FAIL
[ ] Result Screen - PASS / FAIL
[ ] Auto-Reset - PASS / FAIL
[ ] Error Handling - PASS / FAIL
[ ] Performance - PASS / FAIL

Issues Found:
1. _____________________
2. _____________________

Notes:
_____________________

Approval: __________ Date: __________
```

---

**Last Updated:** May 2026
**Version:** 1.0.0
