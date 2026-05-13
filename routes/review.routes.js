const express    = require("express");
const router     = express.Router();
const { verifyJWT, requireRole } = require("../middleware/verifyJWT");
const {
  createReview, getProductReviews, checkReviewed,
  markHelpful, getAllReviews, updateReviewStatus,
} = require("../controllers/review.controller");

// Public
router.get( "/product/:productId", getProductReviews);
router.get( "/check",              checkReviewed);
router.put( "/:id/helpful",        markHelpful);

// Any user (guest or logged in)
router.post("/", createReview);

// Admin
router.get( "/",          verifyJWT, requireRole("admin", "super_admin"), getAllReviews);
router.put( "/:id/status",verifyJWT, requireRole("admin", "super_admin"), updateReviewStatus);

module.exports = router;