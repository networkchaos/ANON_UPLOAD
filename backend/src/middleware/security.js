const rateLimit  = require("express-rate-limit");
const helmet     = require("helmet");
const { verifyAdminToken, hashIP } = require("../utils/crypto");
const logger     = require("../utils/logger");

// ── Helmet: secure HTTP headers ───────────────────────────────────────────────
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", "data:"],
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin(origin, cb) {
    // Allow requests with no origin (Postman, curl, same-origin)
    if (!origin) return cb(null, true);

    const allowed = [
      process.env.FRONTEND_URL,           // production Vercel URL
      "http://localhost:5173",            // Vite dev server
      "http://localhost:3000",            // fallback
      "http://127.0.0.1:5173",
      "https://anon-upload.vercel.app/",
    ].filter(Boolean);

    if (allowed.includes(origin)) return cb(null, true);

    logger.warn(`CORS blocked: ${origin}`);
    cb(new Error("CORS: origin not allowed"));
  },
  methods:      ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  credentials:  false,
  maxAge:       86400,
};
// ── Submission rate limit (per IP) ────────────────────────────────────────────
const submitLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max:      parseInt(process.env.RATE_LIMIT_MAX || "5"),
  keyGenerator: (req) => hashIP(req.ip || req.socket.remoteAddress),
  handler(req, res) {
    logger.warn(`Rate limited: ${hashIP(req.ip)}`);
    res.status(429).json({
      error: "Too many submissions. Please wait before trying again.",
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000")) / 60000) + " minutes",
    });
  },
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: false,
});

// ── Track rate limit (prevent brute-forcing session tokens) ──────────────────
const trackLimiter = rateLimit({
  windowMs: 60_000,   // 1 min
  max:      10,        // 10 lookups per minute per IP
  keyGenerator: (req) => hashIP(req.ip || req.socket.remoteAddress),
  handler(req, res) {
    res.status(429).json({ error: "Too many lookup attempts. Slow down." });
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Admin rate limit (protect login endpoint) ─────────────────────────────────
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max:      5,
  keyGenerator: (req) => hashIP(req.ip || req.socket.remoteAddress),
  handler(req, res) {
    logger.warn(`Admin login brute-force attempt blocked: ${hashIP(req.ip)}`);
    res.status(429).json({ error: "Too many login attempts. Try again in 15 minutes." });
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Admin JWT middleware ───────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const payload = verifyAdminToken(token);
  if (!payload) {
    logger.warn(`Invalid admin token attempt from ${hashIP(req.ip)}`);
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  req.admin = payload;
  next();
}

// ── Request ID middleware (for tracing logs) ──────────────────────────────────
const { randomUUID } = require("crypto");
function requestId(req, res, next) {
  req.requestId = req.headers["x-request-id"] || randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
}

// ── Strip raw IP from req after hashing (never log/store plain IP) ─────────────
function anonymizeIp(req, res, next) {
  req.ipHash = hashIP(req.ip || req.socket.remoteAddress);
  next();
}

module.exports = {
  helmetMiddleware,
  corsOptions,
  submitLimiter,
  trackLimiter,
  adminLoginLimiter,
  requireAdmin,
  requestId,
  anonymizeIp,
};
