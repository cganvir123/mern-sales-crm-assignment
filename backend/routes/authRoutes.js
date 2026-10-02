const express = require("express");
const router = express.Router();
const {
  login,
  register,
  logout,
  refresh,
  me,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  validateRegister,
  validateLogin,
} = require("../middleware/validationMiddleware");

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", protect, me);

module.exports = router;
