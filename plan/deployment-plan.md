# Deployment Plan — Cờ Tướng Online

## Target Infrastructure

```
Internet → Cloudflare (CDN, DDoS) → Vercel (Next.js) → MongoDB Atlas (M0 free)
Domain (user-provided) ──────────────────────────────────────────────────────^
```

## Environment Variables

| Variable | Local (.env.local) | Production (Vercel) |
|----------|-------------------|---------------------|
| `MONGODB_URI` | `mongodb://localhost:27017/co-tuong-online` | Atlas SRV string |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | `https://[domain]` |

## Step 1: MongoDB Atlas (Database)

1. Tạo tài khoản tại cloud.mongodb.com (miễn phí)
2. New Project → New Cluster → **M0 Free** (chọn region gần nhất: Singapore)
3. Database Access → Add Database User:
   - Username: `cot-app`
   - Password: generate strong password
   - Role: `readWriteAnyDatabase`
4. Network Access → Add IP: `0.0.0.0/0` (Vercel serverless cần whitelist all)
5. Connect → Drivers → Copy SRV connection string:
   `mongodb+srv://cot-app:PASSWORD@cluster0.xxxxx.mongodb.net/co-tuong-online?retryWrites=true&w=majority`

## Step 2: GitHub Setup

```bash
cd ~/Documents/minh-ho/games/co-tuong-online/app
git init
git add .
git commit -m "Initial commit: Cờ Tướng Online"
# Tạo repo trên GitHub (github.com/new)
git remote add origin https://github.com/[username]/co-tuong-online.git
git push -u origin main
```

## Step 3: Vercel (Hosting)

**Option A: GitHub Integration (recommended)**
1. Truy cập vercel.com → New Project → Import Git Repository
2. Chọn `co-tuong-online` repo
3. **Root Directory**: `co-tuong-online/app` (quan trọng — app nằm trong subfolder)
4. Framework: Next.js (tự detect)
5. Environment Variables: thêm `MONGODB_URI` và `NEXT_PUBLIC_BASE_URL`
6. Deploy → Vercel tự build và deploy

**Option B: Vercel CLI**
```bash
npm install -g vercel
cd ~/Documents/minh-ho/games/co-tuong-online/app
vercel
# Follow prompts: link to existing project or create new
vercel env add MONGODB_URI production
vercel --prod
```

**Auto-deploy**: Sau khi setup, mỗi `git push origin main` → Vercel tự build + deploy.

## Step 4: Custom Domain

1. Vercel Dashboard → Project → Settings → Domains → Add Domain: `[your-domain.com]`
2. Vercel hiện DNS records cần thêm (CNAME hoặc A record)

**Với Cloudflare**:
```
Registrar → Nameservers → Cloudflare nameservers
Cloudflare → DNS → Add record:
  Type: CNAME
  Name: @ (hoặc subdomain)
  Target: cname.vercel-dns.com  (Vercel cung cấp)
  Proxy: OFF (DNS only) — bật sau khi SSL active
```

Sau khi SSL certificate được Vercel issue (5-10 phút):
→ Cloudflare → DNS → bật Proxy (orange cloud) để có CDN benefits

## Step 5: Post-Deploy Checklist

```bash
# Verify production
curl https://[domain]/api/rooms     # Phải trả về {"rooms": []}
curl -X POST https://[domain]/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"type":"public","hostPlayerId":"test-123","hostName":"Test"}'
# Phải trả về {roomId, shareLink}
```

## Step 6: Monitoring (Optional, Free)

- **Vercel Analytics**: Enable trong Vercel dashboard (free tier có)
- **MongoDB Atlas**: Built-in monitoring trong Atlas dashboard
- **UptimeRobot**: Free uptime monitoring (ping mỗi 5 phút)

## Free Tier Limits Summary

| Service | Limit | Buffer |
|---------|-------|--------|
| MongoDB Atlas M0 | 512MB storage | ~100K ván |
| Vercel Hobby | 100GB bandwidth/tháng | ~2M page views |
| Vercel Hobby | Unlimited function invocations | — |
| Cloudflare Free | Unlimited bandwidth | — |

## CI/CD Pipeline (Auto via Vercel)

```
git push main
  → GitHub webhook → Vercel
  → npm run build (TypeScript check + Next.js build)
  → Deploy to production (zero-downtime swap)
  → Preview URL cho mỗi PR (nếu dùng PR workflow)
```
