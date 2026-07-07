const express = require("express");
const { body } = require("express-validator");
const doctorController = require("../controllers/doctor.controller");
const validateRequest = require("../shared/validator");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

// Fetch lists & details
router.get("/", authenticate, doctorController.list);
router.get("/:id", authenticate, doctorController.get);

// Profile Updates
router.put(
  "/:id",
  authenticate,
  validateRequest([
    body("specialization").optional().trim().notEmpty().withMessage("Specialization cannot be empty"),
    body("qualification").optional().trim().notEmpty().withMessage("Qualification cannot be empty"),
    body("consultation_fee").optional().isFloat({ min: 0 }).withMessage("Consultation fee must be a positive number"),
    body("room_number").optional().trim().notEmpty(),
    body("experience_years").optional().isInt({ min: 0 }).withMessage("Experience must be a positive integer"),
  ]),
  doctorController.update
);

// Profile Deactivations
router.delete("/:id", authenticate, requireRole("ADMIN"), doctorController.delete);

// Schedule Templates Management
router.get("/:id/schedules", authenticate, doctorController.listSchedules);

router.post(
  "/:id/schedules",
  authenticate,
  validateRequest([
    body("day_of_week")
      .isInt({ min: 0, max: 6 })
      .withMessage("Day of week must be between 0 (Sunday) and 6 (Saturday)"),
    body("start_time")
      .matches(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/)
      .withMessage("Start time must be formatted as HH:MM:SS"),
    body("end_time")
      .matches(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/)
      .withMessage("End time must be formatted as HH:MM:SS"),
    body("slot_duration")
      .isInt({ min: 10, max: 120 })
      .withMessage("Slot duration must be an integer between 10 and 120 minutes"),
  ]),
  doctorController.addSchedule
);

router.delete("/:doctorId/schedules/:scheduleId", authenticate, doctorController.removeSchedule);

module.exports = router;
