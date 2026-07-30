const express = require("express");
const router = express.Router();
const {
  getLeads,
  getLeadById, // Newly added
  createLead,
  updateLead,
  deleteLead,
} = require("../controllers/leadController");
const { protect } = require("../middleware/authMiddleware");
const { validateLead } = require("../middleware/validationMiddleware");

// All lead routes require authentication
router.use(protect);

router.route("/").get(getLeads).post(validateLead, createLead);

router
  .route("/:id")
  .get(getLeadById) // Applied the missing RESTful route here
  .patch(validateLead, updateLead)
  .delete(deleteLead);

module.exports = router;
