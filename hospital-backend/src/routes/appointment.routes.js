const express = require("express");
const { body, query } = require("express-validator");
const appointmentController = require("../controllers/appointment.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

// 1. Fetch Slots (query validation)
router.get(
  "/slots",
  authenticate,
  validateRequest([
    query("doctor_id").isUUID().withMessage("Provide a valid doctor_id"),
    query("date").isISO8601().withMessage("Provide a valid date (YYYY-MM-DD)"),
  ]),
  appointmentController.getSlots
);

// 2. Generate Slots (Staff-only)
router.post(
  "/slots/generate",
  authenticate,
  validateRequest([
    body("doctor_id").isUUID().withMessage("Provide a valid doctor_id"),
    body("date").isISO8601().withMessage("Provide a valid date (YYYY-MM-DD)"),
  ]),
  appointmentController.generateSlots
);

// 3. Book Appointment
router.post(
  "/",
  authenticate,
  validateRequest([
    body("doctor_id").isUUID().withMessage("Provide a valid doctor_id"),
    body("slot_id").isUUID().withMessage("Provide a valid slot_id"),
    body("patient_id").optional().isUUID().withMessage("Provide a valid patient_id"),
    body("visit_type").optional().isIn(["consultation", "follow_up", "walk_in"]),
    body("reason_for_visit").optional().trim().notEmpty(),
  ]),
  appointmentController.book
);

// 4. Cancel Appointment
router.post("/:id/cancel", authenticate, appointmentController.cancel);

// 5. List Appointments
router.get("/", authenticate, appointmentController.list);

// 6. View Details
router.get("/:id", authenticate, appointmentController.get);

// 7. Update status (Staff-only)
router.patch(
  "/:id/status",
  authenticate,
  validateRequest([
    body("status")
      .isIn(["checked_in", "consultation", "completed", "cancelled"])
      .withMessage("Invalid status value"),
    body("notes").optional().trim(),
  ]),
  appointmentController.updateStatus
);

module.exports = router;
