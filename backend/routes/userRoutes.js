const express = require("express");
const router = express.Router();
const {
  getSalesUsersWithLeads,
  getAllUsers,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);
router.use(authorize("Admin"));

router.get("/", getAllUsers); // The missing route
router.get("/sales-users", getSalesUsersWithLeads);

module.exports = router;
