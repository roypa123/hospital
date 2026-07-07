const express = require("express");
const dashboardController = require("../controllers/dashboard.controller");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/admin", authenticate, requireRole("ADMIN"), dashboardController.getAdminDashboard);
router.get("/doctor", authenticate, requireRole("DOCTOR"), dashboardController.getDoctorDashboard);
router.get("/patient", authenticate, requireRole("PATIENT"), dashboardController.getPatientDashboard);

module.exports = router;
