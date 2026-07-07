const express = require("express");
const { body, param } = require("express-validator");
const pharmacyController = require("../controllers/pharmacy.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

// Stock Levels
router.post(
  "/stock/:medicineId",
  authenticate,
  requireRole(["ADMIN", "PHARMACIST"]),
  validateRequest([
    param("medicineId").isUUID().withMessage("Invalid medicineId in URL path"),
    body("batch_number").trim().notEmpty().withMessage("Batch number is required"),
    body("expiry_date").isISO8601().withMessage("Provide a valid expiry date (YYYY-MM-DD)"),
    body("quantity").isInt({ min: 1 }).withMessage("Stock quantity must be a positive integer"),
    body("cost_price").isFloat({ min: 0 }).withMessage("Cost price must be positive number"),
    body("selling_price").isFloat({ min: 0 }).withMessage("Selling price must be positive number"),
  ]),
  pharmacyController.addStock
);

router.get(
  "/stock/:medicineId",
  authenticate,
  requireRole(["ADMIN", "PHARMACIST", "DOCTOR"]),
  validateRequest([
    param("medicineId").isUUID().withMessage("Invalid medicineId in URL path"),
  ]),
  pharmacyController.getStockLevel
);

// Dispensing
router.post(
  "/dispense",
  authenticate,
  requireRole("PHARMACIST"),
  validateRequest([
    body("prescriptionId").isUUID().withMessage("Provide a valid prescriptionId to dispense"),
  ]),
  pharmacyController.dispense
);

router.get("/dispenses", authenticate, requireRole(["ADMIN", "PHARMACIST"]), pharmacyController.listDispenses);
router.get("/dispenses/:id", authenticate, requireRole(["ADMIN", "PHARMACIST"]), pharmacyController.getDispense);

module.exports = router;
