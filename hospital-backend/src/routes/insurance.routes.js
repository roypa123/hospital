const express = require("express");
const { body } = require("express-validator");
const insuranceController = require("../controllers/insurance.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/providers", authenticate, insuranceController.getProviders);
router.get("/policies", authenticate, insuranceController.getPolicies);
router.get("/claims", authenticate, insuranceController.listClaims);
router.get("/claims/:id", authenticate, insuranceController.getClaim);

// Policy registration
router.post(
  "/policies",
  authenticate,
  validateRequest([
    body("insurance_provider_id").isUUID().withMessage("Provide a valid insurance_provider_id"),
    body("policy_number").trim().notEmpty().withMessage("Insurance policy number is required"),
    body("expiry_date").isISO8601().withMessage("Provide a valid expiry date (YYYY-MM-DD)"),
    body("coverage_details").optional().isObject(),
    body("patient_id").optional().isUUID(),
  ]),
  insuranceController.registerPolicy
);

// Claim submission (Cashier/Admin)
router.post(
  "/claims",
  authenticate,
  requireRole(["ADMIN", "CASHIER"]),
  validateRequest([
    body("bill_id").isUUID().withMessage("Provide a valid bill_id"),
    body("patient_insurance_policy_id").isUUID().withMessage("Provide a valid patient_insurance_policy_id"),
    body("claim_amount").isFloat({ min: 0.01 }).withMessage("Claim amount must be positive"),
  ]),
  insuranceController.submitClaim
);

// Claims adjudication decision
router.post(
  "/claims/:id/decide",
  authenticate,
  requireRole(["ADMIN", "CASHIER"]),
  validateRequest([
    body("status").isIn(["approved", "rejected"]).withMessage("Adjudication status must be approved or rejected"),
    body("approved_amount").optional().isFloat({ min: 0 }),
    body("rejection_reason").optional().trim().notEmpty(),
  ]),
  insuranceController.decideClaim
);

module.exports = router;
