const express = require("express");
const router = express.Router();
const {
  createDeal,
  updateDealStage,
  getDeals,
  deleteDeal,
} = require("../controllers/dealController");
const { protect } = require("../middleware/authMiddleware");
const {
  validateIdParam,
  validateDeal,
  validateDealStage,
  validateDealQuery,
} = require("../middleware/validationMiddleware");

router.use(protect); // Only authenticated users

router
  .route("/")
  .post(validateDeal, createDeal)
  .get(validateDealQuery, getDeals); // Supports ?stage= and ?leadId=

router
  .route("/:id")
  .patch(validateDealStage, updateDealStage) // Validates id + stage enum
  .delete(validateIdParam(), deleteDeal);

module.exports = router;
