const express = require("express");
const router = express.Router({ mergeParams: true }); // Allows passing leadId from nested routes[cite: 4]
const {
  createActivity,
  getActivitiesByLead,
} = require("../controllers/activityController");
const { protect } = require("../middleware/authMiddleware");
const { validateActivity } = require("../middleware/validationMiddleware");

router.use(protect);

router.route("/").post(validateActivity, createActivity);

// Fetches all activities for a specific lead[cite: 4]
router.route("/lead/:leadId").get(getActivitiesByLead);

module.exports = router;
