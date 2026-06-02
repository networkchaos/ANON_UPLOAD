/**
 * crypto.js — All cryptographic operations for ANON UPLOAD
 *
 * Encryption:  AES-256-GCM (authenticated encryption — tamper-proof)
 * Tokens:      crypto.randomBytes → base62 encoding
 * Hashing:     SHA-256 for IPs, bcrypt for session tokens
 */

const crypto = require("crypto");
const bcrypt  = require("bcryptjs");

const ALG     = "aes-256-gcm";
const KEY_LEN = 32; // 256 bits
const IV_LEN  = 12; // GCM standard
const TAG_LEN = 16;

// Derive a fixed 32-byte key from the env hex string
function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length < 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string");
  }
  return Buffer.from(hex.slice(0, 64), "hex");
}

/**
 * Encrypt a plaintext string → "iv:tag:ciphertext" (all hex)
 */
function encrypt(plaintext) {
  if (!plaintext && plaintext !== "") return null;
  const key  = getKey();
  const iv   = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc1 = cipher.update(String(plaintext), "utf8");
  const enc2 = cipher.final();
  const tag  = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    tag.toString("hex"),
    Buffer.concat([enc1, enc2]).toString("hex"),
  ].join(":");
}

/**
 * Decrypt "iv:tag:ciphertext" → plaintext string
 */
function decrypt(payload) {
  if (!payload) return null;
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted payload");
  const [ivHex, tagHex, ctHex] = parts;
  const key    = getKey();
  const iv     = Buffer.from(ivHex, "hex");
  const tag    = Buffer.from(tagHex, "hex");
  const ct     = Buffer.from(ctHex, "hex");
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const dec1 = decipher.update(ct);
  const dec2 = decipher.final();
  return Buffer.concat([dec1, dec2]).toString("utf8");
}

/**
 * Generate a human-memorable session token:
 *   Format:  AU-XXXXXX::YYYYYYYYYYYYYYYYYYYY
 *   Example: AU-K7MQ2P::a8fGhJ3mNpQrTvXy4Z6w
 *
 * The short part (AU-XXXXXX) is the public Job ID shown on the platform.
 * The long part (::YYYY…)  is the secret key — never stored plain.
 */
function generateSessionToken() {
  const chars   = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const shortId = "AU-" + _randStr(chars, 6).toUpperCase();
  const secret  = _randStr(chars, 24);
  const full    = `${shortId}::${secret}`;
  return { jobId: shortId, secretPart: secret, fullToken: full };
}

function _randStr(chars, len) {
  const buf = crypto.randomBytes(len * 2);
  let out = "";
  for (let i = 0; i < buf.length && out.length < len; i++) {
    const idx = buf[i] % chars.length;
    out += chars[idx];
  }
  return out;
}

/**
 * Hash the session secret (full token) with bcrypt for DB storage.
 * We store the hash, never the plain secret.
 */
async function hashToken(secret) {
  return bcrypt.hash(secret, 12);
}

async function verifyToken(secret, hash) {
  return bcrypt.compare(secret, hash);
}

/**
 * Hash an IP address with SHA-256 + a fixed salt (for abuse detection only).
 * We never store raw IPs.
 */
function hashIP(ip) {
  const salt = process.env.ENCRYPTION_KEY?.slice(0, 16) || "defaultsalt00000";
  return crypto.createHmac("sha256", salt).update(ip || "unknown").digest("hex").slice(0, 16);
}

/**
 * Generate a signed JWT for admin session (short-lived).
 */
const jwt = require("jsonwebtoken");

function signAdminToken() {
  return jwt.sign(
    { role: "admin", iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: "4h" }
  );
}

function verifyAdminToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.role === "admin" ? payload : null;
  } catch {
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
  generateSessionToken,
  hashToken,
  verifyToken,
  hashIP,
  signAdminToken,
  verifyAdminToken,
};
