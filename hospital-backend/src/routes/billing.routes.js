const express = require("express");
const { body, param } = require("express-validator");
const billingController = require("../controllers/billing.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/", authenticate, billingController.list);
router.get("/:id", authenticate, billingController.get);

// Staff invoice creation
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN", "CASHIER"]),
  validateRequest([
    body("patient_id").isUUID().withMessage("Provide a valid patient_id"),
    body("appointment_id").optional().isUUID().withMessage("Provide a valid appointment_id"),
    body("discount_rate").optional().isFloat({ min: 0, max: 1 }),
    body("tax_rate").optional().isFloat({ min: 0, max: 1 }),
    body("items").isArray({ min: 1 }).withMessage("Bill items must be a non-empty list"),
    body("items.*.item_name").trim().notEmpty().withMessage("Item name is required"),
    body("items.*.item_type").isIn(["consultation", "lab_test", "pharmacy", "other"]),
    body("items.*.unit_price").isFloat({ min: 0 }).withMessage("Unit price must be a non-negative number"),
    body("items.*.quantity").optional().isInt({ min: 1 }),
  ]),
  billingController.create
);

// Record Cashier payment
router.post(
  "/:id/pay",
  authenticate,
  requireRole("CASHIER"),
  validateRequest([
    body("amount").isFloat({ min: 0.01 }).withMessage("Payment amount must be greater than zero"),
    body("payment_method").isIn(["cash", "card", "insurance", "bank_transfer"]),
    body("transaction_reference").optional().trim().notEmpty(),
  ]),
  billingController.pay
);

// Conclude checkout transaction (Doctors only)
router.post(
  "/checkout/:appointmentId",
  authenticate,
  requireRole("DOCTOR"),
  validateRequest([
    param("appointmentId").isUUID().withMessage("Invalid appointmentId in path"),
    body("symptoms").trim().notEmpty().withMessage("Symptoms are required for clinical logs"),
    body("diagnosis").trim().notEmpty().withMessage("Diagnosis is required for clinical logs"),
    body("vital_signs").optional().isObject().withMessage("Vital signs must be an object"),
    body("vital_signs.blood_pressure")
      .optional()
      .matches(/^\d{2,3}\/\d{2,3}$/)
      .withMessage("Blood pressure must match format 120/80"),
    body("vital_signs.heart_rate").optional().isInt({ min: 30, max: 220 }),
    body("vital_signs.temperature").optional().isFloat({ min: 30, max: 45 }),
    body("clinical_notes").optional().trim(),
    body("treatment_plan").optional().trim(),
    
    body("prescription").optional().isObject(),
    body("prescription.notes").optional().trim(),
    body("prescription.items").optional().isArray(),
    body("prescription.items.*.medicine_id").optional().isUUID(),
    body("prescription.items.*.medicine_name_custom").optional().trim().notEmpty(),
    body("prescription.items.*.dosage_morning").optional().isBoolean(),
    body("prescription.items.*.dosage_afternoon").optional().isBoolean(),
    body("prescription.items.*.dosage_night").optional().isBoolean(),
    body("prescription.items.*.duration_days").optional().isInt({ min: 1 }),
    body("prescription.items.*.quantity").optional().isInt({ min: 1 }),
    body("prescription.items.*.refill_count").optional().isInt({ min: 0 }),
    
    body("lab_tests").optional().isArray(),
    body("lab_tests.*.test_name").optional().trim().notEmpty(),
    body("lab_tests.*.category").optional().isIn(["Blood Test", "Urine Test", "X-Ray", "MRI", "CT Scan", "ECG", "Other"]),
    
    body("billing").optional().isObject(),
    body("billing.discount_rate").optional().isFloat({ min: 0, max: 1 }),
    body("billing.tax_rate").optional().isFloat({ min: 0, max: 1 }),
    body("billing.custom_charges").optional().isArray(),
    body("billing.custom_charges.*.item_name").optional().trim().notEmpty(),
    body("billing.custom_charges.*.unit_price").optional().isFloat({ min: 0 }),
    body("billing.custom_charges.*.quantity").optional().isInt({ min: 1 }),
  ]),
  billingController.checkout
);

module.exports = router;
