/**
 * routes.js — All API endpoints
 *
 * POST   /api/submit           — anonymous job submission
 * POST   /api/track            — lookup job by token
 * POST   /api/admin/login      — admin password → JWT
 * GET    /api/admin/submissions — list all (paginated, filtered)
 * GET    /api/admin/submissions/:id — get single (full + decrypted)
 * PATCH  /api/admin/submissions/:id — update status + note
 * DELETE /api/admin/submissions/:id — delete
 * GET    /api/health           — uptime check
 */
const { notifyAdminNewJob } = require("./utils/email"); 
const express    = require("express");
const bcrypt     = require("bcryptjs");
const router     = express.Router();

const {
  submitLimiter, trackLimiter, adminLoginLimiter, requireAdmin,
} = require("./middleware/security");

const { validate, submitSchema, trackSchema, adminLoginSchema, adminUpdateSchema } = require("./middleware/validate");

const svc = require("./services/submissions.service");
const { signAdminToken } = require("./utils/crypto");
const logger = require("./utils/logger");

// ── Health ─────────────────────────────────────────────────────────────────────
router.get("/health", (req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// Inside the router.post("/submit", ...) handler, after svc.createSubmission():
router.post("/submit", submitLimiter, validate(submitSchema), async (req, res) => {
  try {
    console.log("VALIDATED BODY:", JSON.stringify(req.validated, null, 2));
    const result = await svc.createSubmission(req.validated, req.ipHash);

    // ── ADD THESE 8 LINES ──────────────────────────────────────────────────
    notifyAdminNewJob({                        // fire-and-forget, non-blocking
      jobId:    result.jobId,
      subject:  req.validated.subject,        // safe — no file content
      deadline: req.validated.deadline,
      budget:   req.validated.budget,
      currency: req.validated.currency,
    }).catch(() => {});                        // swallow — never fail the submit
    // ──────────────────────────────────────────────────────────────────────

    res.status(201).json({
      jobId:     result.jobId,
      fullToken: result.fullToken,
      message:   "Submission received. Save your token — it cannot be recovered.",
    });
  } catch (err) {
    logger.error("Submit error", { error: err.message, reqId: req.requestId });
    res.status(500).json({ error: "Submission failed. Please try again." });
  }
});

// ── Track job ─────────────────────────────────────────────────────────────────
router.post("/track", trackLimiter, validate(trackSchema), async (req, res) => {
  try {
    const { jobId, fullToken } = req.validated;
    const sub = await svc.getSubmission(jobId, fullToken, req.ipHash);
    if (!sub) {
      // Uniform 400 — don't reveal whether ID exists vs token wrong
      return res.status(400).json({ error: "Invalid job ID or token." });
    }
    // Never return fileContent to the track endpoint (confidentiality)
    const { fileContent, description, ...safe } = sub;
    res.json(safe);
  } catch (err) {
    logger.error("Track error", { error: err.message });
    res.status(500).json({ error: "Lookup failed. Please try again." });
  }
});

// ── Admin login ───────────────────────────────────────────────────────────────
router.post("/admin/login", adminLoginLimiter, validate(adminLoginSchema), async (req, res) => {
  try {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) return res.status(500).json({ error: "Admin not configured" });

    const ok = await bcrypt.compare(req.validated.password, hash);
    if (!ok) {
      // Constant-time: always do the compare above before returning
      return res.status(401).json({ error: "Incorrect password" });
    }

    const token = signAdminToken();
    logger.info(`Admin login from ${req.ipHash}`);
    res.json({ token, expiresIn: "4h" });
  } catch (err) {
    logger.error("Admin login error", { error: err.message });
    res.status(500).json({ error: "Login failed" });
  }
});

// ── Admin: list submissions ───────────────────────────────────────────────────
router.get("/admin/submissions", requireAdmin, async (req, res) => {
  try {
    const filter = req.query.status || "all";
    const page   = parseInt(req.query.page || "1");
    const result = await svc.adminListSubmissions(filter, page, 30);
    res.json(result);
  } catch (err) {
    logger.error("Admin list error", { error: err.message });
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// ── Admin: single submission (full content) ───────────────────────────────────
router.get("/admin/submissions/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id.toUpperCase();
    if (!/^AU-[A-Z0-9]{6}$/.test(id)) return res.status(400).json({ error: "Invalid job ID" });
    const sub = await svc.adminGetSubmission(id);
    if (!sub) return res.status(404).json({ error: "Not found" });
    res.json(sub);
  } catch (err) {
    logger.error("Admin get error", { error: err.message });
    res.status(500).json({ error: "Failed to fetch submission" });
  }
});

// ── Admin: update status + note ───────────────────────────────────────────────
router.patch("/admin/submissions/:id", requireAdmin, validate(adminUpdateSchema), async (req, res) => {
  try {
    const id = req.params.id.toUpperCase();
    if (!/^AU-[A-Z0-9]{6}$/.test(id)) return res.status(400).json({ error: "Invalid job ID" });
    await svc.adminUpdateSubmission(id, req.validated);
    res.json({ success: true });
  } catch (err) {
    logger.error("Admin update error", { error: err.message });
    res.status(500).json({ error: "Failed to update submission" });
  }
});

// ── Admin: delete ─────────────────────────────────────────────────────────────
router.delete("/admin/submissions/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id.toUpperCase();
    if (!/^AU-[A-Z0-9]{6}$/.test(id)) return res.status(400).json({ error: "Invalid job ID" });
    await svc.adminDeleteSubmission(id);
    res.json({ success: true });
  } catch (err) {
    logger.error("Admin delete error", { error: err.message });
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

module.exports = router;
