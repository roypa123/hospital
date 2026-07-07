const express = require("express");
const { body, param } = require("express-validator");
const userController = require("../controllers/user.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/", authenticate, requireRole("ADMIN"), userController.list);

router.get(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validateRequest([
    param("id").isUUID().withMessage("Invalid user ID in URL path"),
  ]),
  userController.get
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validateRequest([
    param("id").isUUID().withMessage("Invalid user ID in URL path"),
    body("first_name").optional().trim().notEmpty().withMessage("First name cannot be empty"),
    body("last_name").optional().trim().notEmpty().withMessage("Last name cannot be empty"),
  ]),
  userController.update
);

router.put(
  "/:id/role",
  authenticate,
  requireRole("ADMIN"),
  validateRequest([
    param("id").isUUID().withMessage("Invalid user ID in URL path"),
    body("role").trim().notEmpty().withMessage("Role name is required"),
  ]),
  userController.changeRole
);

router.put(
  "/:id/status",
  authenticate,
  requireRole("ADMIN"),
  validateRequest([
    param("id").isUUID().withMessage("Invalid user ID in URL path"),
    body("is_active").isBoolean().withMessage("is_active status must be a boolean value"),
  ]),
  userController.changeStatus
);

module.exports = router;
