const {
  body,
  check,
  param,
  query,
  validationResult,
} = require("express-validator");
const {
  LEAD_STATUSES,
  LEAD_SOURCES,
  DEAL_STAGES,
  ACTIVITY_TYPES,
  FOLLOW_UP,
} = require("../utils/constants");

// Centralized error responder for validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array();
    // "message" matches every other error response; "errors" is kept for detail
    return res.status(400).json({ message: list[0].msg, errors: list });
  }
  next();
};

// Reusable check for :id / :leadId URL params
const validateIdParam = (name = "id") => [
  param(name, `Invalid ${name}`).isMongoId(),
  handleValidationErrors,
];

// Trims + lowercases, so emails are always stored and compared the same way
const emailField = (field = "email") =>
  check(field, "Please include a valid email")
    .isString()
    .trim()
    .toLowerCase()
    .isEmail()
    .isLength({ max: 254 });

// Optional free-text field. An empty string is allowed: it clears the value.
const optionalText = (field, label, max) =>
  check(field, `${label} must be at most ${max} characters`)
    .optional()
    .isString()
    .trim()
    .isLength({ max });

// Optional date. null or "" is allowed: it clears the value.
const optionalDate = (field, label) =>
  check(field, `${label} must be a valid date`)
    .optional({ values: "falsy" })
    .isISO8601();

// --- Auth Validation Rules ---
const validateRegister = [
  check("name", "Name is required (max 100 characters)")
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 100 }),
  emailField(),
  check("password", "Password must be 8 to 72 characters")
    .isString()
    .isLength({ min: 8 })
    // bcrypt ignores everything after 72 bytes
    .custom((value) => Buffer.byteLength(value, "utf8") <= 72),
  handleValidationErrors,
];

// No length rules here: older accounts may have shorter passwords
const validateLogin = [
  emailField(),
  check("password", "Password is required").isString().notEmpty(),
  handleValidationErrors,
];

// --- Lead Validation Rules ---
const leadDetailFields = [
  check("phone", "Phone must be at most 30 characters")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 30 }),
  optionalText("company", "Company", 150),
  check("source", "Invalid lead source")
    .optional()
    .isIn([...LEAD_SOURCES, ""]), // "" clears it
  optionalText("notes", "Notes", 2000),
  check("status", "Invalid status").optional().isIn(LEAD_STATUSES),
  check("assignedTo", "Invalid assignee").optional().isMongoId(),
];

// Create: name and email are required
const validateLead = [
  check("name", "Name is required (max 150 characters)")
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 150 }),
  emailField(),
  ...leadDetailFields,
  handleValidationErrors,
];

// Update: every field is optional, so a status change can send just { status }
const validateLeadUpdate = [
  check("name", "Name cannot be empty (max 150 characters)")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 150 }),
  emailField().optional(),
  ...leadDetailFields,
  handleValidationErrors,
];

const validateLeadQuery = [
  query("status", "Invalid status")
    .optional({ values: "falsy" })
    .isIn(LEAD_STATUSES),
  query("search", "Search must be text").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
];

// --- Deal Validation Rules ---
const validateDeal = [
  check("title", "Title is required (max 150 characters)")
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 150 }),
  check("amount", "Amount must be a number of 0 or more").isFloat({ min: 0 }),
  check("stage", "Invalid stage").optional().isIn(DEAL_STAGES),
  optionalDate("expectedCloseDate", "Expected close date"),
  check("leadId", "Valid Lead ID is required").isMongoId(),
  handleValidationErrors,
];

// Update: any combination of title, amount, stage and close date
const validateDealUpdate = [
  param("id", "Invalid deal id").isMongoId(),
  check("title", "Title cannot be empty (max 150 characters)")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 150 }),
  check("amount", "Amount must be a number of 0 or more")
    .optional()
    .isFloat({ min: 0 }),
  check("stage", "Invalid stage").optional().isIn(DEAL_STAGES),
  optionalDate("expectedCloseDate", "Expected close date"),
  handleValidationErrors,
];

const validateDealQuery = [
  query("stage", "Invalid stage")
    .optional({ values: "falsy" })
    .isIn(DEAL_STAGES),
  query("leadId", "Invalid lead id").optional({ values: "falsy" }).isMongoId(),
  handleValidationErrors,
];

// --- Activity Validation Rules ---
const validateActivity = [
  check("type", "Invalid activity type").isIn(ACTIVITY_TYPES),
  check("notes", "Notes are required (max 2000 characters)")
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 2000 }),
  check("leadId", "Valid Lead ID is required").isMongoId(),
  // Follow-ups are tasks, so they need a due date
  check("dueDate", "A valid due date is required for follow-ups")
    .if(body("type").equals(FOLLOW_UP))
    .isISO8601(),
  handleValidationErrors,
];

const validateActivityUpdate = [
  param("id", "Invalid activity id").isMongoId(),
  check("type", "Invalid activity type").optional().isIn(ACTIVITY_TYPES),
  check("notes", "Notes cannot be empty (max 2000 characters)")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 2000 }),
  check("dueDate", "Due date must be a valid date").optional().isISO8601(),
  check("completed", "Completed must be true or false")
    .optional()
    .isBoolean()
    .toBoolean(),
  handleValidationErrors,
];

module.exports = {
  validateIdParam,
  validateRegister,
  validateLogin,
  validateLead,
  validateLeadUpdate,
  validateLeadQuery,
  validateDeal,
  validateDealUpdate,
  validateDealQuery,
  validateActivity,
  validateActivityUpdate,
};
