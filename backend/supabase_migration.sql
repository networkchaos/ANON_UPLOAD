-- ═══════════════════════════════════════════════════════════════════
-- ANON UPLOAD — Supabase Schema
-- Run this entire file in your Supabase SQL Editor (once)
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── submissions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id              TEXT PRIMARY KEY,                    -- AU-XXXXXX
  session_hash    TEXT NOT NULL UNIQUE,               -- bcrypt hash of session token
  token_prefix    TEXT NOT NULL,                      -- first 4 chars for hint display
  
  -- Encrypted job fields (AES-256-GCM encrypted server-side)
  subject_enc     TEXT NOT NULL,
  description_enc TEXT NOT NULL,
  file_name_enc   TEXT NOT NULL,
  file_content_enc TEXT NOT NULL,                     -- encrypted file content
  
  -- Non-sensitive metadata
  deadline        DATE NOT NULL,
  budget_amount   NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  
  -- Status
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','inprogress','done','rejected')),
  admin_note_enc  TEXT,                              -- encrypted admin message
  
  -- Timestamps
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Security
  ip_hash         TEXT,                              -- hashed IP for abuse detection (not stored raw)
  access_count    INTEGER NOT NULL DEFAULT 0,
  last_accessed   TIMESTAMPTZ
);

-- ── audit_log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  event       TEXT NOT NULL,              -- 'submit' | 'track' | 'admin_view' | 'admin_update' | 'rate_limit'
  job_id      TEXT,                       -- AU-XXXXXX if applicable
  ip_hash     TEXT,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── rate_buckets (for persistent rate limiting backup) ───────────────────────
CREATE TABLE IF NOT EXISTS rate_buckets (
  ip_hash     TEXT PRIMARY KEY,
  hit_count   INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_submissions_status     ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted  ON submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created          ON audit_log(created_at DESC);

-- ── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_submissions_updated
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security — lock down all direct access ────────────────────────
ALTER TABLE submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_buckets ENABLE ROW LEVEL SECURITY;

-- Only service_role (your backend) can access — anon/authenticated users get nothing
CREATE POLICY "service_only_submissions"  ON submissions  USING (false);
CREATE POLICY "service_only_audit"        ON audit_log    USING (false);
CREATE POLICY "service_only_rate"         ON rate_buckets USING (false);

-- ═══════════════════════════════════════════════════════════════════
-- Done. Your service_role key bypasses RLS — keep it secret.
-- ═══════════════════════════════════════════════════════════════════
