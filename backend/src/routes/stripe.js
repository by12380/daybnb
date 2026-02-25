const { Router } = require("express");
const express = require("express");
const stripeController = require("../controllers/stripeController");
const { requireAuth } = require("../middleware/auth");

const router = Router();

// Create checkout session (authenticated)
router.post("/create-checkout-session", requireAuth, stripeController.createCheckoutSession);

// Verify a checkout session after redirect (authenticated)
router.post("/verify-session", requireAuth, stripeController.verifySession);

// Webhook – needs raw body, NOT JSON parsed.
// We use express.raw() here so that Stripe can verify the signature.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeController.handleWebhook
);

module.exports = router;
