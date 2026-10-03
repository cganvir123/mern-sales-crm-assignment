const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createActivity,
  getActivitiesByLead,
  updateActivity,
  deleteActivity,
  getTasks,
} = require("../controllers/activityController");
const { protect } = require("../middleware/authMiddleware");
const {
  validateActivity,
  validateActivityUpdate,
  validateIdParam,
} = require("../middleware/validationMiddleware");

router.use(protect);

router.route("/").post(validateActivity, createActivity);

// Open follow-ups for the dashboard (overdue + next 7 days)
router.get("/tasks", getTasks);

// Fetches all activities for a specific lead
router
  .route("/lead/:leadId")
  .get(validateIdParam("leadId"), getActivitiesByLead);

router
  .route("/:id")
  .patch(validateActivityUpdate, updateActivity)
  .delete(validateIdParam(), deleteActivity);

module.exports = router;
