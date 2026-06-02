/**
 * submissions.service.js
 *
 * All database interaction for submissions.
 * Encryption happens HERE before any data touches the DB.
 * Decryption happens HERE before any data leaves the DB.
 *
 * The Supabase DB never sees plaintext job content.
 */

const { getDB }  = require("../db/client");
const {
  encrypt, decrypt,
  generateSessionToken,
  hashToken, verifyToken,
} = require("../utils/crypto");
const logger = require("../utils/logger");

// ── Create a new submission ───────────────────────────────────────────────────
async function createSubmission(data, ipHash) {
  const db = getDB();

  // 1. Generate cryptographic session token
  const { jobId, secretPart, fullToken } = generateSessionToken();

  // 2. Hash the full token (bcrypt) — only the hash goes in DB
  const sessionHash = await hashToken(fullToken);

  // 3. Encrypt all sensitive content fields
  const row = {
    id:               jobId,
    session_hash:     sessionHash,
    token_prefix:     fullToken.slice(0, 6),   // "AU-XXX" — hint only

    subject_enc:      encrypt(data.subject),
    description_enc:  encrypt(data.description),
    file_name_enc:    encrypt(data.fileName || "pasted-content.txt"),
    file_content_enc: encrypt(data.fileContent),

    deadline:         data.deadline,
    budget_amount:    data.budget,
    currency:         data.currency || "USD",

    status:           "pending",
    ip_hash:          ipHash,
  };

  const { error } = await db.from("submissions").insert(row);
  if (error) {
    logger.error("DB insert error", { error: error.message });
    throw new Error("Failed to save submission");
  }

  // 4. Log the event (no sensitive data in logs)
  await auditLog(db, "submit", jobId, ipHash, `currency=${data.currency} deadline=${data.deadline}`);

  // 5. Return only what the client needs (full token shown ONCE, never stored plain)
  return { jobId, fullToken };
}

// ── Track / lookup a submission ───────────────────────────────────────────────
async function getSubmission(jobId, fullToken, ipHash) {
  const db = getDB();

  // 1. Fetch by job ID (public, non-secret part)
  const { data: rows, error } = await db
    .from("submissions")
    .select("*")
    .eq("id", jobId)
    .limit(1);

  if (error || !rows || rows.length === 0) {
    await auditLog(db, "track_miss", jobId, ipHash, "not_found");
    return null;
  }

  const row = rows[0];

  // 2. Verify the full token against the stored bcrypt hash
  const valid = await verifyToken(fullToken, row.session_hash);
  if (!valid) {
    await auditLog(db, "track_fail", jobId, ipHash, "token_mismatch");
    return null;
  }

  // 3. Update access tracking
  await db
    .from("submissions")
    .update({ access_count: row.access_count + 1, last_accessed: new Date().toISOString() })
    .eq("id", jobId);

  await auditLog(db, "track_ok", jobId, ipHash, `status=${row.status}`);

  // 4. Decrypt and return safe fields (never return session_hash, ip_hash)
  return sanitizeSubmission(row);
}

// ── Admin: get all submissions (paginated) ────────────────────────────────────
async function adminListSubmissions(filter, page = 1, limit = 30) {
  const db = getDB();
  const from = (page - 1) * limit;

  let query = db
    .from("submissions")
    .select("id, token_prefix, deadline, budget_amount, currency, status, submitted_at, updated_at, access_count", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(from, from + limit - 1);

  if (filter && filter !== "all") query = query.eq("status", filter);

  const { data, error, count } = await query;
  if (error) throw new Error("Failed to list submissions");

  return { submissions: data, total: count, page, limit };
}

// ── Admin: get single submission (full, decrypted) ─────────────────────────────
async function adminGetSubmission(jobId) {
  const db = getDB();
  const { data: rows, error } = await db
    .from("submissions")
    .select("*")
    .eq("id", jobId)
    .limit(1);

  if (error || !rows || rows.length === 0) return null;

  await auditLog(db, "admin_view", jobId, null, null);
  return sanitizeSubmission(rows[0]);
}

// ── Admin: update submission status + optional note ───────────────────────────
async function adminUpdateSubmission(jobId, { status, adminNote }) {
  const db = getDB();

  const updates = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (adminNote !== undefined) {
    updates.admin_note_enc = adminNote ? encrypt(adminNote) : null;
  }

  const { error } = await db
    .from("submissions")
    .update(updates)
    .eq("id", jobId);

  if (error) throw new Error("Failed to update submission");

  await auditLog(db, "admin_update", jobId, null, `status=${status}`);
  return true;
}

// ── Admin: delete submission ──────────────────────────────────────────────────
async function adminDeleteSubmission(jobId) {
  const db = getDB();
  const { error } = await db.from("submissions").delete().eq("id", jobId);
  if (error) throw new Error("Failed to delete submission");
  await auditLog(db, "admin_delete", jobId, null, null);
  return true;
}

// ── Audit log helper ──────────────────────────────────────────────────────────
async function auditLog(db, event, jobId, ipHash, detail) {
  try {
    await db.from("audit_log").insert({ event, job_id: jobId, ip_hash: ipHash, detail });
  } catch (e) {
    logger.error("Audit log failed", { error: e.message });
  }
}

// ── Sanitize: decrypt fields, strip internal columns ─────────────────────────
function sanitizeSubmission(row) {
  return {
    id:          row.id,
    subject:     safeDecrypt(row.subject_enc),
    description: safeDecrypt(row.description_enc),
    fileName:    safeDecrypt(row.file_name_enc),
    fileContent: safeDecrypt(row.file_content_enc),
    adminNote:   row.admin_note_enc ? safeDecrypt(row.admin_note_enc) : null,
    deadline:    row.deadline,
    budget:      row.budget_amount,
    currency:    row.currency,
    status:      row.status,
    submittedAt: row.submitted_at,
    updatedAt:   row.updated_at,
    accessCount: row.access_count,
    // NOTE: session_hash, ip_hash are NEVER returned
  };
}

function safeDecrypt(val) {
  try { return val ? decrypt(val) : null; }
  catch { return "[decryption error]"; }
}

module.exports = {
  createSubmission,
  getSubmission,
  adminListSubmissions,
  adminGetSubmission,
  adminUpdateSubmission,
  adminDeleteSubmission,
};
