const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect); // Any logged-in user; data is scoped by role in the controller

router.get("/stats", getDashboardStats);

module.exports = router;
