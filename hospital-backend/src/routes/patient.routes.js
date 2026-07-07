const express = require("express");
const { body } = require("express-validator");
const patientController = require("../controllers/patient.controller");
const validateRequest = require("../shared/validator");
const { authenticate } = require("../middleware/rbac");

const router = express.Router();

router.get("/", authenticate, patientController.list);
router.get("/:id", authenticate, patientController.get);

router.put(
  "/:id",
  authenticate,
  validateRequest([
    body("date_of_birth").optional().isISO8601().withMessage("Provide a valid date (YYYY-MM-DD)"),
    body("gender").optional().isIn(["Male", "Female", "Other", "Prefer not to say"]),
    body("blood_group").optional().isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
    body("allergies").optional().isArray().withMessage("Allergies must be a list"),
    body("emergency_contact").optional().isObject().withMessage("Emergency contact must be an object"),
    body("insurance_details").optional().isObject().withMessage("Insurance details must be an object"),
  ]),
  patientController.update
);

router.delete("/:id", authenticate, patientController.delete);

module.exports = router;
