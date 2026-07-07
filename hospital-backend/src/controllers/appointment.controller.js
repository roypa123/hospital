const appointmentService = require("../services/appointment.service");
const patientRepository = require("../repositories/patient.repository");
const { sendSuccess } = require("../shared/response");
const { ForbiddenError, BadRequestError } = require("../shared/errors");

class AppointmentController {
  async getSlots(req, res, next) {
    try {
      const { doctor_id, date } = req.query;
      if (!doctor_id || !date) {
        throw new BadRequestError("doctor_id and date are required query parameters");
      }
      const slots = await appointmentService.getSlotsForDoctorAndDate(doctor_id, date);
      return sendSuccess(res, "Available slots retrieved", slots);
    } catch (error) {
      return next(error);
    }
  }

  async generateSlots(req, res, next) {
    try {
      const { doctor_id, date } = req.body;
      const slots = await appointmentService.generateSlots(doctor_id, date);
      return sendSuccess(res, "Slots generated successfully", slots, 201);
    } catch (error) {
      return next(error);
    }
  }

  async book(req, res, next) {
    try {
      const { doctor_id, slot_id, visit_type, reason_for_visit } = req.body;
      let { patient_id } = req.body;

      const isStaffOrAdmin = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST"].includes(r)
      );

      // ABAC: If user is a Patient, force booking for their own profile
      if (!isStaffOrAdmin && req.user.roles.includes("PATIENT")) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient) {
          throw new ForbiddenError("You must have a patient profile to book an appointment");
        }
        patient_id = patient.id;
      } else if (!patient_id) {
        throw new BadRequestError("patient_id is required when booking as staff");
      }

      const appointment = await appointmentService.bookAppointment(
        patient_id,
        doctor_id,
        slot_id,
        visit_type,
        reason_for_visit
      );

      return sendSuccess(res, "Appointment booked successfully", appointment, 201);
    } catch (error) {
      return next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await appointmentService.cancelAppointment(
        id,
        req.user.id,
        req.user.roles
      );
      return sendSuccess(res, "Appointment cancelled successfully", updated);
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const filters = {};
      const isStaffOrAdmin = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"].includes(r)
      );

      // ABAC: If patient, restrict to their own records
      if (!isStaffOrAdmin && req.user.roles.includes("PATIENT")) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient) {
          return sendSuccess(res, "Appointments list retrieved", []);
        }
        filters.patient_id = patient.id;
      } else {
        // Staff filter options
        if (req.query.patient_id) filters.patient_id = req.query.patient_id;
        if (req.query.doctor_id) filters.doctor_id = req.query.doctor_id;
      }

      if (req.query.date) filters.date = req.query.date;
      if (req.query.status) filters.status = req.query.status;

      const list = await appointmentService.getAppointments(filters);
      return sendSuccess(res, "Appointments list retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async get(req, res, next) {
    try {
      const appointment = await appointmentService.getAppointmentById(req.params.id);

      const isStaffOrAdmin = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"].includes(r)
      );
      const isSelf = await this._checkIsSelfPatient(appointment.patient_id, req.user.id);

      if (!isStaffOrAdmin && !isSelf) {
        throw new ForbiddenError("Forbidden: You cannot access another patient's appointment details");
      }

      return sendSuccess(res, "Appointment details retrieved", appointment);
    } catch (error) {
      return next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const isStaffOrAdmin = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"].includes(r)
      );

      if (!isStaffOrAdmin) {
        throw new ForbiddenError("Forbidden: Only staff members can progress appointment workflows");
      }

      const updated = await appointmentService.updateStatus(id, status, notes);
      return sendSuccess(res, `Appointment progressed to status '${status}'`, updated);
    } catch (error) {
      return next(error);
    }
  }

  // Helper
  async _checkIsSelfPatient(patientId, userId) {
    const patient = await patientRepository.findByUserId(userId);
    return patient && patient.id === patientId;
  }
}

module.exports = new AppointmentController();
