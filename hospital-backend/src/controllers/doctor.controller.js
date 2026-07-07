const doctorService = require("../services/doctor.service");
const { sendSuccess } = require("../shared/response");
const { ForbiddenError } = require("../shared/errors");

class DoctorController {
  async list(req, res, next) {
    try {
      const { department_id, specialization } = req.query;
      const list = await doctorService.getDoctors({ department_id, specialization });
      return sendSuccess(res, "Doctors list retrieved successfully", list);
    } catch (error) {
      return next(error);
    }
  }

  async get(req, res, next) {
    try {
      const doctor = await doctorService.getDoctorById(req.params.id);
      return sendSuccess(res, "Doctor profile retrieved successfully", doctor);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const doctor = await doctorService.getDoctorById(id);

      const isAdmin = req.user.roles.includes("ADMIN");
      const isSelf = doctor.user_id === req.user.id;

      // Allow only Admin or the Doctor themselves to update their profile (ABAC constraint)
      if (!isAdmin && !isSelf) {
        throw new ForbiddenError("Forbidden: You cannot modify another doctor's profile");
      }

      const updated = await doctorService.updateDoctor(id, req.body);
      return sendSuccess(res, "Doctor profile updated successfully", updated);
    } catch (error) {
      return next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await doctorService.deleteDoctor(req.params.id);
      return sendSuccess(res, "Doctor profile deactivated successfully");
    } catch (error) {
      return next(error);
    }
  }

  // --- DOCTOR SCHEDULES TEMPLATES ---

  async listSchedules(req, res, next) {
    try {
      const list = await doctorService.getDoctorSchedules(req.params.id);
      return sendSuccess(res, "Doctor schedules templates retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async addSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const doctor = await doctorService.getDoctorById(id);

      const isAdmin = req.user.roles.includes("ADMIN");
      const isSelf = doctor.user_id === req.user.id;

      if (!isAdmin && !isSelf) {
        throw new ForbiddenError("Forbidden: You cannot manage schedules for another doctor");
      }

      const schedule = await doctorService.addDoctorSchedule(id, req.body);
      return sendSuccess(res, "Schedule template added successfully", schedule, 201);
    } catch (error) {
      return next(error);
    }
  }

  async removeSchedule(req, res, next) {
    try {
      // Find the doctor associated with the schedule to check rights
      const list = await doctorService.getDoctorSchedules(req.params.doctorId);
      const scheduleExists = list.find((s) => s.id === req.params.scheduleId);
      if (!scheduleExists) {
        throw new NotFoundError("Schedule template not found for this doctor");
      }

      const doctor = await doctorService.getDoctorById(req.params.doctorId);
      const isAdmin = req.user.roles.includes("ADMIN");
      const isSelf = doctor.user_id === req.user.id;

      if (!isAdmin && !isSelf) {
        throw new ForbiddenError("Forbidden: You cannot manage schedules for another doctor");
      }

      await doctorService.removeDoctorSchedule(req.params.scheduleId);
      return sendSuccess(res, "Schedule template removed successfully");
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new DoctorController();
