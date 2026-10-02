const express = require("express");
const router = express.Router();
const {
  getSalesUsersWithLeads,
  getAllUsers,
  getSalesUserOptions,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);
router.use(authorize("Admin"));

router.get("/", getAllUsers);
router.get("/sales-users", getSalesUsersWithLeads);
router.get("/sales-users/options", getSalesUserOptions);

module.exports = router;
