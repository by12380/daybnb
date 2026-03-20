const { Router } = require("express");

const authRoutes = require("./auth");
const roomRoutes = require("./rooms");
const bookingRoutes = require("./bookings");
const userRoutes = require("./users");
const reviewRoutes = require("./reviews");
const notificationRoutes = require("./notifications");
const contactRoutes = require("./contact");
const stripeRoutes = require("./stripe");
const likesRoutes = require("./likes");
const adminRoutes = require("./admin");
const ownerRoutes = require("./owner");
const chatRoutes = require("./chat");
const offerRoutes = require("./offers");
const heroBannerRoutes = require("./heroBanners");
const aiChatRoutes = require("./aiChat");

const router = Router();

router.use("/auth", authRoutes);
router.use("/rooms", roomRoutes);
router.use("/bookings", bookingRoutes);
router.use("/users", userRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/contact", contactRoutes);
router.use("/stripe", stripeRoutes);
router.use("/likes", likesRoutes);
router.use("/admin", adminRoutes);
router.use("/owner", ownerRoutes);
router.use("/chat", chatRoutes);
router.use("/offers", offerRoutes);
router.use("/hero-banners", heroBannerRoutes);
router.use("/ai", aiChatRoutes);

module.exports = router;
