const { Router } = require("express");

const authRoutes = require("./auth");
const roomRoutes = require("./rooms");
const bookingRoutes = require("./bookings");
const userRoutes = require("./users");
const reviewRoutes = require("./reviews");
const notificationRoutes = require("./notifications");
const contactRoutes = require("./contact");
const stripeRoutes = require("./stripe");

const router = Router();

router.use("/auth", authRoutes);
router.use("/rooms", roomRoutes);
router.use("/bookings", bookingRoutes);
router.use("/users", userRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/contact", contactRoutes);
router.use("/stripe", stripeRoutes);

module.exports = router;
