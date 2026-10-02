const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createActivity,
  getActivitiesByLead,
} = require("../controllers/activityController");
const { protect } = require("../middleware/authMiddleware");
const {
  validateActivity,
  validateIdParam,
} = require("../middleware/validationMiddleware");

router.use(protect);

router.route("/").post(validateActivity, createActivity);

// Fetches all activities for a specific lead
router.route("/lead/:leadId").get(validateIdParam("leadId"), getActivitiesByLead);

module.exports = router;
