const express = require("express");
const { body } = require("express-validator");
const departmentController = require("../controllers/department.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

// Public/Authenticated access
router.get("/", authenticate, departmentController.list);
router.get("/:id", authenticate, departmentController.get);

// Admin-only write/modify access
router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  validateRequest([
    body("name").trim().notEmpty().withMessage("Department name is required"),
    body("code")
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage("Code must be between 2 and 20 characters long"),
    body("description").optional().trim(),
  ]),
  departmentController.create
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validateRequest([
    body("name").optional().trim().notEmpty().withMessage("Department name cannot be empty"),
    body("code")
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage("Code must be between 2 and 20 characters long"),
    body("description").optional().trim(),
  ]),
  departmentController.update
);

router.delete("/:id", authenticate, requireRole("ADMIN"), departmentController.delete);

module.exports = router;
