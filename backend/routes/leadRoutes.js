const express = require("express");
const router = express.Router();
const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
} = require("../controllers/leadController");
const { protect } = require("../middleware/authMiddleware");
const {
  validateIdParam,
  validateLead,
  validateLeadUpdate,
  validateLeadQuery,
} = require("../middleware/validationMiddleware");

// All lead routes require authentication
router.use(protect);

router
  .route("/")
  .get(validateLeadQuery, getLeads)
  .post(validateLead, createLead);

router
  .route("/:id")
  .get(validateIdParam(), getLeadById)
  // Partial-update validation: sending just { status } is now allowed
  .patch(validateIdParam(), validateLeadUpdate, updateLead)
  .delete(validateIdParam(), deleteLead);

module.exports = router;
