/**
 * server.js — ANON UPLOAD Backend
 *
 * Security layers:
 *   1. Helmet    — secure HTTP headers, CSP, HSTS
 *   2. CORS      — frontend-only origin whitelist
 *   3. Rate limit — per-IP, per-endpoint, brute-force protection
 *   4. Joi       — strict input validation + sanitization
 *   5. AES-256-GCM — all job content encrypted before DB storage
 *   6. bcrypt    — session tokens hashed (never stored plain)
 *   7. JWT       — short-lived admin sessions (4h, HS256)
 *   8. RLS       — Supabase row-level security (no direct DB access)
 *   9. IP hashing — HMAC-SHA256, raw IPs never logged or stored
 */

require("dotenv").config();

const express     = require("express");
const cors        = require("cors");
const compression = require("compression");

const {
  helmetMiddleware,
  corsOptions,
  requestId,
  anonymizeIp,
} = require("./middleware/security");

const routes = require("./routes");
const logger = require("./utils/logger");

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Trust proxy (for correct IP behind Render/Railway/Vercel) ─────────────────
app.set("trust proxy", 1);

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "512kb" }));   // Cap payload size
app.use(requestId);
app.use(anonymizeIp);

// ── Request logging (no sensitive data) ──────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info("request", {
      method: req.method,
      path:   req.path,
      status: res.statusCode,
      ms:     Date.now() - start,
      reqId:  req.requestId,
    });
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Never leak stack traces in production
  logger.error("Unhandled error", { error: err.message, stack: process.env.NODE_ENV === "development" ? err.stack : undefined });
  if (err.message?.startsWith("CORS")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`ANON UPLOAD backend running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});

module.exports = app;
