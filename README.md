# ▓ ANON_UPLOAD — Anonymous Job Platform

> AES-256-GCM encrypted. Zero IP storage. Cryptographic session tokens. Free to host.

---

## Architecture

```
[ Browser ] ──HTTPS──▶ [ Vercel (React/Vite) ] ──HTTPS──▶ [ Render (Express API) ] ──▶ [ Supabase (Postgres) ]
```

---

## Security Stack

| Layer | Implementation |
|---|---|
| Transport | HTTPS only (Vercel + Render enforce TLS) |
| HTTP Headers | Helmet (CSP, HSTS, X-Frame, etc.) |
| CORS | Strict allowlist — frontend URL only |
| Input validation | Joi — all fields validated + sanitized |
| Rate limiting | express-rate-limit: 5 submits/15min, 10 lookups/min per IP |
| Content encryption | **AES-256-GCM** — every job field encrypted before DB insert |
| Token storage | bcrypt (cost 12) — session token hash only, never plaintext |
| Admin auth | bcrypt password + **JWT HS256** (4h expiry) |
| IP storage | HMAC-SHA256 hash only — raw IP never stored or logged |
| DB access control | Supabase **Row Level Security** — anon/authenticated keys locked out entirely |
| File size cap | 400KB text limit enforced client + server side |

**What the database actually contains for job content:**
```
subject_enc      = "a3f1b2:tagHex:ciphertextHex"   ← AES-256-GCM encrypted
description_enc  = "..."
file_content_enc = "..."
session_hash     = "$2a$12$..."                      ← bcrypt hash of full token
ip_hash          = "a4b3c2d1..."                     ← HMAC-SHA256, 16 chars only
```
Zero plaintext sensitive data in the database.

---

## Session Token Format

```
AU-K7MQ2P::a8fGhJ3mNpQrTvXy4Z6wR9sB2cD
│  ├──────┘  └──────────────────────────┘
│  Job ID          Secret key (24 chars)
│  (public)        (cryptographically random)
│
└─ Prefix (shared across all jobs)
```

- **Job ID** (`AU-XXXXXX`) — public, used for display
- **Secret key** — never stored, only the bcrypt hash is kept
- **Full token** — shown to user **once only** at submission
- Lookup requires both parts; mismatch returns identical error (no oracle)

---

## Step-by-Step Setup

### 1. Supabase (free tier — database)

1. Go to [supabase.com](https://supabase.com) → New Project
2. In **SQL Editor**, paste and run the entire contents of `backend/supabase_migration.sql`
3. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key (NOT anon key) → `SUPABASE_SERVICE_KEY`

### 2. Generate secret keys

Run these in your terminal:

```bash
# ENCRYPTION_KEY (must be exactly 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ADMIN_PASSWORD_HASH (replace 'yourpassword' with your chosen password)
node -e "const b=require('bcryptjs'); b.hash('yourpassword',12).then(console.log)"
```

### 3. Deploy backend to Render (free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service → connect your repo
3. Set **Root Directory**: `backend`
4. **Build command**: `npm install`
5. **Start command**: `npm start`
6. Add all environment variables from `.env.example` (with your real values)
7. Note your Render URL: `https://anon-upload-api.onrender.com`

### 4. Deploy frontend to Vercel (free)

1. Go to [vercel.com](https://vercel.com) → New Project → import your repo
2. Set **Root Directory**: `frontend`
3. Add environment variable:
   ```
   VITE_API_URL = https://anon-upload-api.onrender.com/api
   ```
4. Set your Render backend's `FRONTEND_URL` env var to your Vercel URL

### 5. Custom domain (free options)

| Option | How |
|---|---|
| **Vercel** | Settings → Domains → add any domain you own for free |
| **Freenom** | Get a free .tk/.ml domain → point DNS to Vercel |
| **Cloudflare** | Free DNS + SSL for any domain |
| **js.org** | Free subdomain for open source projects |

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env    # fill in your values
npm install
npm run dev             # starts on :4000

# Terminal 2 — Frontend
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev             # starts on :5173
```

---

## Admin Access

1. Navigate to `/` → click **⬡ ADMIN**
2. Enter your password (the one you bcrypt-hashed in setup)
3. JWT session issued — lasts 4 hours
4. For each submission you can:
   - Read decrypted content
   - Set status: Approved / In Progress / Done / Rejected
   - Send a message to the client (they see it on the tracker)
   - Delete the submission

---

## File Structure

```
anon-upload/
├── backend/
│   ├── src/
│   │   ├── server.js              ← Express entry point
│   │   ├── routes.js              ← All API endpoints
│   │   ├── db/client.js           ← Supabase service client
│   │   ├── middleware/
│   │   │   ├── security.js        ← Helmet, CORS, rate limits, JWT guard
│   │   │   └── validate.js        ← Joi schemas
│   │   ├── services/
│   │   │   └── submissions.service.js  ← Encrypt/decrypt + DB logic
│   │   └── utils/
│   │       ├── crypto.js          ← AES-256-GCM, bcrypt, JWT, IP hash
│   │       └── logger.js          ← Winston
│   ├── supabase_migration.sql     ← Run once in Supabase SQL editor
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                ← Full UI (all views)
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── render.yaml                    ← Render deployment config
└── README.md
```
