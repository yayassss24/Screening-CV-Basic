-- Supabase Schema for JagoCV
-- Jalankan di Supabase SQL Editor (https://supabase.com > SQL Editor)

-- 1. USERS
create table if not exists users (
  email text primary key,
  paket text not null default 'TRIAL',
  screening_sisa integer not null default 3,
  screening_total_count integer not null default 0,
  kode_aktif text,
  tanggal_berlaku text,
  created_at timestamptz not null default now()
);

alter table users enable row level security;
create policy "public read users" on users for select using (true);
create policy "public insert users" on users for insert with check (true);
create policy "public update users" on users for update using (true);

-- 2. TRANSACTIONS
create table if not exists transactions (
  id text primary key,
  email text not null,
  paket text not null,
  nominal integer not null,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  resend_count integer not null default 0,
  verified_identity boolean not null default false,
  has_screenshot boolean not null default false,
  screenshot_hash text,
  screenshot_base64 text,
  screenshot_mime_type text,
  code_plain_for_db text,
  verified_at timestamptz,
  ai_recommendation text,
  ai_confidence real,
  ai_reason text,
  user_problem_description text,
  verification_message text,
  manual_claim_details jsonb
);

alter table transactions enable row level security;
create policy "public read transactions" on transactions for select using (true);
create policy "public insert transactions" on transactions for insert with check (true);
create policy "public update transactions" on transactions for update using (true);

-- 3. SCREENSHOTS (separate table for large base64 payloads)
create table if not exists screenshots (
  transaction_id text primary key references transactions(id) on delete cascade,
  base64 text not null,
  mime_type text not null default 'image/png'
);

alter table screenshots enable row level security;
create policy "public read screenshots" on screenshots for select using (true);
create policy "public insert screenshots" on screenshots for insert with check (true);
create policy "public update screenshots" on screenshots for update using (true);

-- 4. ACTIVATION CODES
create table if not exists activation_codes (
  hash text primary key,
  kode_plain text not null,
  paket text not null,
  digunakan boolean not null default false,
  email_penerima text,
  email_digunakan text,
  tanggal_cadaluwarsa text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table activation_codes enable row level security;
create policy "public read activation_codes" on activation_codes for select using (true);
create policy "public insert activation_codes" on activation_codes for insert with check (true);
create policy "public update activation_codes" on activation_codes for update using (true);

-- 5. ANALYSES
create table if not exists analyses (
  id text primary key,
  email text not null,
  paket text not null,
  tanggal timestamptz,
  cv_kandidat_name text,
  job_title text,
  skor_akhir real,
  data jsonb
);

alter table analyses enable row level security;
create policy "public read analyses" on analyses for select using (true);
create policy "public insert analyses" on analyses for insert with check (true);
create policy "public update analyses" on analyses for update using (true);

-- Indexes
create index if not exists idx_transactions_email on transactions(email);
create index if not exists idx_transactions_status on transactions(status);
create index if not exists idx_transactions_created_at on transactions(created_at desc);
create index if not exists idx_analyses_email on analyses(email);
create index if not exists idx_activation_codes_email on activation_codes(email_penerima);
