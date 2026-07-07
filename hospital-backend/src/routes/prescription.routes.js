const express = require("express");
const { body } = require("express-validator");
const prescriptionController = require("../controllers/prescription.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/", authenticate, prescriptionController.list);
router.get("/:id", authenticate, prescriptionController.get);

// Doctors write prescriptions
router.post(
  "/",
  authenticate,
  requireRole("DOCTOR"),
  validateRequest([
    body("patient_id").isUUID().withMessage("Provide a valid patient_id"),
    body("medical_record_id").optional().isUUID().withMessage("Provide a valid medical_record_id"),
    body("notes").optional().trim(),
    body("items").isArray({ min: 1 }).withMessage("Prescription items must be a non-empty list"),
    body("items.*.medicine_id").optional().isUUID().withMessage("Provide a valid medicine_id"),
    body("items.*.medicine_name_custom").optional().trim().notEmpty().withMessage("Custom medicine name cannot be empty"),
    body("items.*.dosage_morning").isBoolean().withMessage("dosage_morning must be boolean"),
    body("items.*.dosage_afternoon").isBoolean().withMessage("dosage_afternoon must be boolean"),
    body("items.*.dosage_night").isBoolean().withMessage("dosage_night must be boolean"),
    body("items.*.instruction").optional().isIn(["BEFORE_FOOD", "AFTER_FOOD", "WITH_FOOD"]),
    body("items.*.duration_days").isInt({ min: 1 }).withMessage("Duration days must be a positive integer"),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("Total quantity must be a positive integer"),
    body("items.*.refill_count").optional().isInt({ min: 0 }).withMessage("Refill count must be a non-negative integer"),
    body("items.*.additional_instructions").optional().trim(),
  ]),
  prescriptionController.create
);

// Refills requests
router.post(
  "/:id/refill",
  authenticate,
  validateRequest([
    body("itemId").isUUID().withMessage("Provide a valid itemId to refill"),
  ]),
  prescriptionController.refill
);

module.exports = router;
