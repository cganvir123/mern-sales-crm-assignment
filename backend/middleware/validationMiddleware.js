const { check, validationResult } = require("express-validator");

// Centralized error responder for validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Ties into the required proper status codes
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// --- Auth Validation Rules ---
const validateRegister = [
  check("name", "Name is required").not().isEmpty(),
  check("email", "Please include a valid email").isEmail(),
  check("password", "Password must be at least 6 characters").isLength({
    min: 6,
  }),
  handleValidationErrors,
];

const validateLogin = [
  check("email", "Please include a valid email").isEmail(),
  check("password", "Password is required").exists(),
  handleValidationErrors,
];

// --- Lead Validation Rules ---
const validateLead = [
  check("name", "Name is required").not().isEmpty(),
  check("email", "Please include a valid email").isEmail(),
  check("status", "Invalid status")
    .optional()
    .isIn(["New", "Contacted", "Qualified"]),
  handleValidationErrors,
];

// --- Deal Validation Rules ---
const validateDeal = [
  check("title", "Title is required").not().isEmpty(),
  check("amount", "Amount must be a valid number").isNumeric(),
  check("stage", "Invalid stage")
    .optional()
    .isIn(["Prospect", "Negotiation", "Won", "Lost"]),
  check("leadId", "Valid Lead ID is required").isMongoId(),
  handleValidationErrors,
];

// --- Activity Validation Rules ---
const validateActivity = [
  check("type", "Invalid activity type").isIn([
    "Calls",
    "Meetings",
    "Notes",
    "Follow-ups",
  ]),
  check("notes", "Notes are required").not().isEmpty(),
  check("leadId", "Valid Lead ID is required").isMongoId(),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateLead,
  validateDeal,
  validateActivity,
};
