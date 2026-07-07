const express = require("express");
const { body } = require("express-validator");
const medicineController = require("../controllers/medicine.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/", authenticate, medicineController.list);
router.get("/:id", authenticate, medicineController.get);

// Catalog modifications restricted to ADMIN or PHARMACIST roles
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN", "PHARMACIST"]),
  validateRequest([
    body("name").trim().notEmpty().withMessage("Medicine name is required"),
    body("generic_name").trim().notEmpty().withMessage("Generic chemical name is required"),
    body("category").trim().notEmpty().withMessage("Category classification is required"),
    body("strength").trim().notEmpty().withMessage("Strength dosage is required (e.g. 500mg)"),
    body("form").trim().notEmpty().withMessage("Dosage form is required (e.g. Tablet)"),
  ]),
  medicineController.create
);

router.put(
  "/:id",
  authenticate,
  requireRole(["ADMIN", "PHARMACIST"]),
  validateRequest([
    body("name").optional().trim().notEmpty(),
    body("generic_name").optional().trim().notEmpty(),
    body("category").optional().trim().notEmpty(),
    body("strength").optional().trim().notEmpty(),
    body("form").optional().trim().notEmpty(),
  ]),
  medicineController.update
);

router.delete("/:id", authenticate, requireRole(["ADMIN", "PHARMACIST"]), medicineController.delete);

module.exports = router;
