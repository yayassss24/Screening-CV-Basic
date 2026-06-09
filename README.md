# JagoCV — Screening CV & Billing Platform

Platform screening CV otomatis dengan sistem pembayaran terintegrasi. Mendukung verifikasi pembayaran otomatis via OCR, dashboard admin, dan deployment Vercel + Railway.

## Fitur

### 🎯 Screening CV
- Upload & parsing CV otomatis (ATS)
- Analisis kecocokan dengan deskripsi pekerjaan
- Dukungan PDF, DOCX, PNG/JPG
- Skor ATS dan rekomendasi perbaikan

### 💰 Billing & Pembayaran
- **Auto-Verify dengan OCR**: Upload bukti transfer → OCR otomatis → PAID/FAILED (tanpa review manual)
- **3 Paket**: TRIAL (Rp 10.000), BASIC (Rp 75.000), PRO (Rp 100.000)
- **Deteksi fraud**: QRIS, duplikat, nominal kurang/lebih, status GAGAL
- **Manual review**: Admin bisa konfirmasi/tolak transaksi
- **Activation code**: Format `JCV-{PAKET}-XXXX-XXXX`

### 🔐 Admin Dashboard
- URL: `/admin`
- Login: kode aktivasi admin
- Lihat semua transaksi, filter (Semua/Pending/Lunas/Ditolak)
- Lihat screenshot bukti bayar
- Konfirmasi / Tolak transaksi manual
- Polling otomatis tiap 5 detik

### 📡 User Polling
- Endpoint: `GET /api/billing/transactions?email=...`
- CS Chatbot bisa polling status transaksi user

## Arsitektur

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Vercel    │────▶│  OCR Service │────▶│  Supabase (DB)  │
│ Serverless  │     │  (Railway)   │     └─────────────────┘
│             │     │  Tesseract.js│
│ api/*.ts    │     └──────────────┘
│ admin.ts    │
│ landing SPA │     ┌─────────────────┐
└─────────────┘     │  /tmp/file.json │
                    │  (file fallback)│
                    └─────────────────┘
```

### Stack
- **Frontend**: Vanilla HTML/CSS/JS (landing page + admin dashboard)
- **Backend**: TypeScript (Vercel serverless functions)
- **OCR**: Railway (Tesseract.js) — unlimited, tanpa cold start
- **Database**: Supabase (PostgreSQL) + file fallback `/tmp/transactions.json`
- **AI Vision**: Gemini API (fallback OCR tier 3)

## Deployment

### Vercel (Main App)
```bash
# Deploy otomatis dari GitHub
# https://screening-cv-basic.vercel.app
```
**Required Environment Variables:**
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `OCR_SERVICE_URL` | Railway OCR service URL |
| `GEMINI_API_KEY` | (opsional) Gemini AI fallback |
| `GEMINI_API_KEY_PAYMENT` | (opsional) Gemini AI fallback |

### Railway (OCR Service)
- Deploy dari folder `ocr-service/`
- Tesseract.js worker: pre-warmed, reused antar request
- Health check: `/health`
- OCR endpoint: `POST /ocr` with `{ image: "base64...", language: "ind+eng" }`

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/billing/create-transaction` | Buat transaksi + auto-verify |
| GET | `/api/billing/transactions?email=` | Polling status user |
| GET | `/api/billing/admin/transactions` | List semua transaksi |
| GET | `/api/billing/admin/screenshot/:id` | Lihat bukti bayar |
| POST | `/api/billing/admin/confirm-manual` | Konfirmasi manual |
| POST | `/api/billing/admin/reject` | Tolak manual |
| GET | `/api/billing/admin/diag` | Diagnostics |
| GET | `/admin` | Admin dashboard |
| GET | `/api/*` | Express app (ATS, profile, dll) |

## OCR Auto-Verify Flow

```
User upload screenshot
  │
  ├─▶ [0ms]   Cek ukuran & format gambar
  ├─▶ [0ms]   Cek duplikat (SHA256 hash)
  ├─▶ [1-2s]  OCR Service Railway (Tesseract.js)
  │             └─ timeout 15s → fallback
  ├─▶ [5-8s]  Tesseract.js lokal (Vercel)
  │             └─ error → fallback
  ├─▶ [3-5s]  Gemini AI Vision
  │             └─ error → manual review
  │
  ├─▶ Validasi OCR text:
  │   ├─ QRIS?        → FAILED
  │   ├─ GAGAL?       → FAILED
  │   ├─ Nominal?     → exact match (===)
  │   │   ├─ kurang   → FAILED
  │   │   ├─ lebih    → FAILED
  │   │   └─ tepat    → PAID ✅
  │   └─ Tidak terbaca → MANUAL REVIEW
```

## Local Development

```bash
npm install
npm run dev
```

## Struktur Folder

```
├── api/
│   ├── admin-api.ts      # Billing & admin API (Vercel)
│   ├── admin.ts          # Admin dashboard HTML
│   ├── express-app.ts    # Express app (ATS, profile)
│   └── server.ts         # Main server (dev)
├── ocr-service/
│   ├── index.js          # Railway OCR service
│   ├── package.json
│   └── railway.json
├── public/               # Landing page assets
├── supabase-schema.sql   # Database schema
├── vercel.json           # Vercel routing
└── package.json
```

## License

Private — Internal use
