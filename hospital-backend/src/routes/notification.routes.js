const express = require("express");
const { body, param } = require("express-validator");
const notificationController = require("../controllers/notification.controller");
const validateRequest = require("../shared/validator");
const { authenticate } = require("../middleware/rbac");

const router = express.Router();

router.get("/", authenticate, notificationController.list);

router.put(
  "/read-all",
  authenticate,
  notificationController.markAllRead
);

router.put(
  "/:id/read",
  authenticate,
  validateRequest([
    param("id").isUUID().withMessage("Invalid notification ID in URL path"),
  ]),
  notificationController.markRead
);

module.exports = router;
