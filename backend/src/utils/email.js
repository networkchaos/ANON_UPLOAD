/**
 * email.js — Resend notifications for ANON UPLOAD
 *
 * Triggered on:
 *   1. New submission  → alert admin
 *   2. Status update   → no email (client has no email — anonymous by design)
 *
 * We NEVER include file content or description in emails.
 * Only metadata: Job ID, deadline, budget, currency.
 */

const { Resend } = require("resend");
const logger = require("./logger");

let _client = null;
function getResend() {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  _client = new Resend(key);
  return _client;
}

/**
 * Notify admin of a new anonymous submission.
 * @param {object} meta - { jobId, deadline, budget, currency, subject }
 */
async function notifyAdminNewJob(meta) {
  const to   = process.env.ADMIN_EMAIL;
  const from = process.env.PLATFORM_FROM || "onboarding@resend.dev";

  if (!to) {
    logger.warn("ADMIN_EMAIL not set — skipping notification");
    return;
  }

  try {
    await getResend().emails.send({
      from,
      to,
      subject: `[ANON_UPLOAD] New job: ${meta.jobId} — ${meta.currency} ${meta.budget}`,
      html: `
        <div style="font-family:monospace;background:#090b0f;color:#c9d1d9;padding:32px;border-radius:4px;">
          <h2 style="color:#00ff88;letter-spacing:4px;margin:0 0 24px;">▓ NEW JOB RECEIVED</h2>
          <table style="border-collapse:collapse;width:100%;">
            <tr>
              <td style="color:#4a5568;font-size:11px;letter-spacing:2px;padding:8px 0;border-bottom:1px solid #1a2232;width:120px;">JOB ID</td>
              <td style="color:#0ff;font-weight:700;padding:8px 0 8px 16px;border-bottom:1px solid #1a2232;">${meta.jobId}</td>
            </tr>
            <tr>
              <td style="color:#4a5568;font-size:11px;letter-spacing:2px;padding:8px 0;border-bottom:1px solid #1a2232;">SUBJECT</td>
              <td style="padding:8px 0 8px 16px;border-bottom:1px solid #1a2232;">${escHtml(meta.subject)}</td>
            </tr>
            <tr>
              <td style="color:#4a5568;font-size:11px;letter-spacing:2px;padding:8px 0;border-bottom:1px solid #1a2232;">DEADLINE</td>
              <td style="padding:8px 0 8px 16px;border-bottom:1px solid #1a2232;">${meta.deadline}</td>
            </tr>
            <tr>
              <td style="color:#4a5568;font-size:11px;letter-spacing:2px;padding:8px 0;">BUDGET</td>
              <td style="color:#00ff88;font-weight:700;padding:8px 0 8px 16px;">${meta.currency} ${meta.budget}</td>
            </tr>
          </table>
          <div style="margin-top:24px;padding:12px 16px;border:1px solid #1a2232;font-size:12px;color:#6e7681;">
            Log into your admin panel to review the full submission and respond.
          </div>
          <p style="margin-top:24px;font-size:10px;color:#4a5568;letter-spacing:2px;">
            ANON_UPLOAD PLATFORM — FILE CONTENT NOT INCLUDED IN THIS EMAIL
          </p>
        </div>
      `,
    });
    logger.info(`Admin notified for job ${meta.jobId}`);
  } catch (err) {
    // Non-fatal — job is already saved, email is just a convenience
    logger.error("Email notification failed", { error: err.message, jobId: meta.jobId });
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { notifyAdminNewJob };