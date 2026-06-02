const Joi = require("joi");

const CURRENCIES = ["USD", "KES", "EUR", "GBP", "CAD", "AUD"];
const STATUSES   = ["pending", "approved", "inprogress", "done", "rejected"];

// ── Submit a new job ──────────────────────────────────────────────────────────
const submitSchema = Joi.object({
  subject:     Joi.string().min(3).max(200).required().trim(),
  description: Joi.string().min(10).max(5000).required().trim(),
  deadline:    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  budget:      Joi.number().positive().max(100000).required(),
  currency:    Joi.string().valid(...CURRENCIES).default("USD"),
  fileName:    Joi.string().max(260).optional().allow(""),
  fileContent: Joi.string().min(1).max(500_000).required(), // ~500KB plain text cap
});

// ── Track a job (lookup) ─────────────────────────────────────────────────────
const trackSchema = Joi.object({
  jobId:       Joi.string().pattern(/^AU-[A-Z0-9]{6}$/).required(),
  fullToken:   Joi.string().min(32).max(64).required(),
});

// ── Admin login ───────────────────────────────────────────────────────────────
const adminLoginSchema = Joi.object({
  password: Joi.string().min(6).max(128).required(),
});

// ── Admin update submission ───────────────────────────────────────────────────
const adminUpdateSchema = Joi.object({
  status:    Joi.string().valid(...STATUSES).required(),
  adminNote: Joi.string().max(2000).optional().allow(""),
});

// ── Validation middleware factory ─────────────────────────────────────────────
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({ error: "Validation failed", details: messages });
    }
    req.validated = value;
    next();
  };
}

module.exports = {
  validate,
  submitSchema,
  trackSchema,
  adminLoginSchema,
  adminUpdateSchema,
};
