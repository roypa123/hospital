const express = require("express");
const { body } = require("express-validator");
const medicalRecordController = require("../controllers/medicalRecord.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/", authenticate, medicalRecordController.list);
router.get("/:id", authenticate, medicalRecordController.get);

// Only doctors can write EMR logs
router.post(
  "/",
  authenticate,
  requireRole("DOCTOR"),
  validateRequest([
    body("patient_id").isUUID().withMessage("Provide a valid patient_id"),
    body("appointment_id").optional().isUUID().withMessage("Provide a valid appointment_id"),
    body("symptoms").trim().notEmpty().withMessage("Symptoms description is required"),
    body("diagnosis").trim().notEmpty().withMessage("Diagnosis is required"),
    body("vital_signs").optional().isObject().withMessage("Vital signs must be an object"),
    body("vital_signs.blood_pressure")
      .optional()
      .matches(/^\d{2,3}\/\d{2,3}$/)
      .withMessage("Blood pressure must match format 120/80"),
    body("vital_signs.heart_rate").optional().isInt({ min: 30, max: 220 }).withMessage("Heart rate must be an integer"),
    body("vital_signs.temperature").optional().isFloat({ min: 30, max: 45 }).withMessage("Temperature must be a decimal (Celsius)"),
    body("clinical_notes").optional().trim(),
    body("treatment_plan").optional().trim(),
  ]),
  medicalRecordController.create
);

module.exports = router;
