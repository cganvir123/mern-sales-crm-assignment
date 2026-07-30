const express = require("express");
const router = express.Router();
const {
  createDeal,
  updateDealStage,
  getDealsByStage,
  deleteDeal,
} = require("../controllers/dealController");
const { protect } = require("../middleware/authMiddleware");
const { validateDeal } = require("../middleware/validationMiddleware");

router.use(protect); // Ensure only authenticated users can access[cite: 5]

router.route("/").post(validateDeal, createDeal).get(getDealsByStage); // Uses ?stage= query parameter[cite: 5]

router
  .route("/:id")
  .patch(updateDealStage) // PATCH is best practice for partial updates like a stage change[cite: 5]
  .delete(deleteDeal);

module.exports = router;
