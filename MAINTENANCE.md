# Panduan Maintenance & Monitoring

## 🔍 Daily Monitoring

### Quick Health Check
```bash
# 1. Check frontend server
curl http://localhost:3000 | head -5
# Expected: HTML response

# 2. Check backend API
curl http://localhost:5000/health
# Expected: {"status":"ok"}

# 3. Check iPad connectivity
# From iPad: open browser to http://[laptop-ip]:3000
# Should load app normally
```

### Log Monitoring
```bash
# Frontend logs (dalam pnpm dev terminal)
# Look for: errors, failed fetches, warnings

# Backend logs (dalam node server.js terminal)
# Look for: API errors, timeout, database issues

# Enable debug mode untuk more details:
# Set DEBUG=true di backend .env
node server.js
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to fetch" on iPad
**Cause:** Backend unreachable atau wrong IP
**Solutions:**
```bash
# 1. Verify IP
# Dari laptop: ipconfig (Windows) atau ifconfig (Mac/Linux)
# Dari iPad: Safari → address bar → http://[IP]:5000/health

# 2. Update .env.local
# Check NEXT_PUBLIC_BACKEND_URL matches actual IP
# Restart pnpm dev

# 3. Firewall check
# Make sure port 5000 not blocked
# Windows: netstat -ano | findstr 5000
# Mac/Linux: lsof -i :5000
```

### Issue 2: QRIS not generating
**Cause:** Invalid QRIS string atau library error
**Solutions:**
```bash
# 1. Verify QRIS string
# Check backend logs: should show valid QRIS format
# Format: 000201263...

# 2. Test endpoint
curl -X POST http://localhost:5000/api/payment/generate-qris \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test123","amount":50000}'

# 3. Check library installed
npm list qris-dynamic-conversion
# Should show version

# 4. Fallback to mock
# If real QRIS fails, app auto-fallback to mock
```

### Issue 3: Polling timeout
**Cause:** Network latency atau backend delay
**Solutions:**
```bash
# 1. Increase timeout in useSession.ts
// Change AbortSignal.timeout(5000) to 10000 (10 sec)

# 2. Check network latency
# From iPad: ping [laptop-ip]
# Should be < 50ms

# 3. Reduce other load
# Close other apps/tabs on iPad
# Restart browser cache

# 4. Adjust polling interval
# In backend .env: POLL_INTERVAL=3000 (3 sec instead of 2)
```

### Issue 4: High memory usage on iPad
**Cause:** Large images atau memory leak
**Solutions:**
```bash
# 1. Clear cache
# iPad Settings → Safari → Clear History and Website Data

# 2. Reduce image quality
# In backend: reduce preview from 480p to 360p
// Change: sharp(image).resize(360, ...)

# 3. Restart app
# Close Safari, reopen app

# 4. Monitor memory
# Safari DevTools → Memory tab
# Target: < 150MB
```

---

## 🔧 Regular Maintenance Tasks

### Weekly
- [ ] Check disk space on laptop (for photo storage)
- [ ] Review logs for errors
- [ ] Test full flow on iPad
- [ ] Verify QRIS still working

### Monthly
- [ ] Update dependencies
  ```bash
  # Frontend
  pnpm update

  # Backend
  npm update
  ```
- [ ] Clean up old sessions in Supabase
  ```sql
  DELETE FROM sessions 
  WHERE created_at < now() - interval '30 days';
  ```
- [ ] Backup database (Supabase auto-backup, but verify)
- [ ] Review and optimize images in storage

### Quarterly
- [ ] Security updates (Node.js, dependencies)
- [ ] Performance audit
- [ ] User feedback review
- [ ] Update documentation

---

## 📊 Database Maintenance

### Supabase Health Check
```sql
-- Check table sizes
SELECT 
  schemaname, 
  tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
WHERE schemaname='public';

-- Check active sessions
SELECT COUNT(*) FROM sessions WHERE status != 'completed';

-- Check old payments
SELECT * FROM payments 
WHERE created_at < now() - interval '30 days';

-- Cleanup old results
DELETE FROM results 
WHERE created_at < now() - interval '90 days';
```

### Backup Strategy
**Supabase automatic:**
- Daily automated backups (7 days retention)
- Manual backup: Settings → Backups

**Manual backup command:**
```bash
# Export data
npx supabase db pull --schema=public

# Upload to storage
# Use Supabase Storage for image backups
```

---

## 🚀 Performance Optimization

### Frontend Optimization
1. **Image Optimization**
   ```bash
   # Compress images before deploy
   pnpm build
   # Next.js auto-optimizes images
   ```

2. **Bundle Size Check**
   ```bash
   npm install --save-dev webpack-bundle-analyzer
   npm run build -- --analyze
   # Target: < 500KB main bundle
   ```

3. **Caching Strategy**
   ```javascript
   // In next.config.js
   headers: async () => {
     return [
       {
         source: '/api/:path*',
         headers: [
           { key: 'Cache-Control', value: 'no-cache' }
         ]
       }
     ]
   }
   ```

### Backend Optimization
1. **Database Query Performance**
   ```bash
   # Enable query logging
   DEBUG=true node server.js
   # Monitor slow queries (> 100ms)
   ```

2. **Connection Pooling**
   ```javascript
   // In server.js
   const pool = new Pool({
     max: 5,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   })
   ```

3. **Memory Management**
   ```bash
   # Monitor memory usage
   node --inspect server.js
   # Use Chrome DevTools for profiling
   ```

---

## 🔔 Error Monitoring

### Setup Error Logging (Optional)
```javascript
// Use Sentry for production error tracking
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.errorHandler());
```

### Manual Error Tracking
```bash
# Check logs regularly
# Frontend: console errors in Safari DevTools
# Backend: console.error output

# Setup log rotation (recommended)
npm install winston
# Log to file: logs/error.log
```

---

## 🔒 Security Maintenance

### Regular Security Checks
1. **Dependency vulnerabilities**
   ```bash
   pnpm audit
   npm audit
   ```

2. **Update vulnerable packages**
   ```bash
   pnpm update --latest
   npm update --latest
   ```

3. **Check Supabase security**
   - Verify RLS policies enabled
   - Check API key permissions
   - Review auth settings

### Secrets Management
```bash
# Never commit .env files
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Use environment variable management
# Option 1: Manual (copy-paste dari provider)
# Option 2: Use Vercel Secrets (jika deploy ke Vercel)
# Option 3: Use 1Password / LastPass untuk management
```

---

## 📈 Scaling Considerations

### If using > 100 sessions/day:
1. **Database indexing**
   ```sql
   CREATE INDEX idx_sessions_status ON sessions(status);
   CREATE INDEX idx_payments_session ON payments(session_id);
   ```

2. **API rate limiting**
   ```javascript
   npm install express-rate-limit
   app.use(rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100
   }))
   ```

3. **Image CDN**
   ```bash
   # Instead of serving from laptop
   # Use Cloudinary or Supabase Storage CDN
   ```

4. **Load balancing**
   - Deploy multiple backend instances
   - Use nginx as reverse proxy

### If using > 1000 sessions/day:
1. **Database migration**
   - Consider PostgreSQL hosted (AWS RDS)
   - Implement read replicas

2. **Microservices**
   - Separate image processing to worker
   - Use job queue (Bull, RabbitMQ)

3. **Caching layer**
   - Redis for session caching
   - CDN for image delivery

---

## 🆘 Disaster Recovery

### Backup & Restore
```bash
# Before major changes, backup:
# 1. Database export
# 2. .env files (in secure location)
# 3. Supabase Storage files

# Restore from backup:
# 1. Export database from backup
# 2. Update connection strings
# 3. Test full flow
```

### Rollback Plan
```bash
# If major bug introduced:
# 1. Note last working version (git tag)
# 2. git checkout <last-working-version>
# 3. Rebuild and redeploy
# 4. Verify with test cases
```

### Communication Plan
- Notify users if unavailable
- Post status updates
- Provide ETA for fix

---

## 📞 Support Escalation

### Level 1: Self-Service (try first)
- Check troubleshooting docs
- Review logs
- Restart services

### Level 2: Community/Chat
- Post in dev forum
- Ask in Stack Overflow

### Level 3: Vendor Support
- Supabase support (for database issues)
- Node.js LTS support (for runtime issues)
- Device manufacturer (for iPad issues)

---

## 📚 Useful Commands Reference

```bash
# Frontend
pnpm dev              # Start dev server
pnpm build           # Production build
pnpm lint            # Code lint
pnpm test            # Run tests

# Backend
node server.js       # Start server
npm test             # Run backend tests
npm audit            # Check vulnerabilities

# Database
npx supabase status  # Check Supabase status
npx supabase db pull # Sync local DB schema

# System
ps aux | grep node   # See running processes
kill -9 <PID>        # Kill process
netstat -ano | findstr :5000  # Check port (Windows)
lsof -i :5000        # Check port (Mac/Linux)
```

---

## 📋 Maintenance Checklist

```
Monthly Maintenance Checklist:

Date: __________

Tasks:
[ ] Reviewed logs for errors
[ ] Updated dependencies
[ ] Cleaned database old sessions
[ ] Verified QRIS still working
[ ] Tested full flow on iPad
[ ] Checked disk space
[ ] Verified backups

Issues found:
1. _____________________
2. _____________________

Action items:
1. _____________________
2. _____________________

Completed by: __________
Sign-off: __________
```

---

**Last Updated:** May 2026
**Version:** 1.0.0
