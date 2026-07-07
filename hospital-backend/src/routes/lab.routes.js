const express = require("express");
const { body } = require("express-validator");
const labController = require("../controllers/lab.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/", authenticate, labController.list);
router.get("/:id", authenticate, labController.get);

// Doctors order tests
router.post(
  "/",
  authenticate,
  requireRole("DOCTOR"),
  validateRequest([
    body("patient_id").isUUID().withMessage("Provide a valid patient_id"),
    body("test_name").trim().notEmpty().withMessage("Lab test name is required"),
    body("category")
      .trim()
      .isIn(["Blood Test", "Urine Test", "X-Ray", "MRI", "CT Scan", "ECG", "Other"])
      .withMessage("Provide a valid test category"),
  ]),
  labController.order
);

// Lab tech uploads findings
router.post(
  "/:id/results",
  authenticate,
  requireRole("LAB_TECHNICIAN"),
  validateRequest([
    body("results_summary").trim().notEmpty().withMessage("Results summary is required"),
    body("findings").trim().notEmpty().withMessage("Detailed findings notes are required"),
  ]),
  labController.recordResults
);

// Doctors approve test results
router.post("/:id/approve", authenticate, requireRole("DOCTOR"), labController.approve);

module.exports = router;
