const express = require("express");
const reportController = require("../controllers/report.controller");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get(
  "/financial",
  authenticate,
  requireRole(["ADMIN", "CASHIER"]),
  reportController.getFinancial
);

router.get(
  "/clinical",
  authenticate,
  requireRole(["ADMIN", "DOCTOR"]),
  reportController.getClinical
);

router.get(
  "/inventory",
  authenticate,
  requireRole(["ADMIN", "PHARMACIST"]),
  reportController.getInventory
);

module.exports = router;
