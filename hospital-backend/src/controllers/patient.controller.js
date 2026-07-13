const patientService = require("../services/patient.service");
const { sendSuccess } = require("../shared/response");
const { ForbiddenError } = require("../shared/errors");

class PatientController {
  async list(req, res, next) {
    try {
      const { gender, blood_group, search } = req.query;
      
      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"].includes(r)
      );

      if (!isStaff) {
        throw new ForbiddenError("Forbidden: Only staff members can view patients listings");
      }

      const list = await patientService.getPatients({ gender, blood_group, search });
      return sendSuccess(res, "Patients list retrieved successfully", list);
    } catch (error) {
      return next(error);
    }
  }

  async get(req, res, next) {
    try {
      const { id } = req.params;
      const patient = await patientService.getPatientById(id);

      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"].includes(r)
      );
      const isSelf = patient.user_id === req.user.id;

      if (!isStaff && !isSelf) {
        throw new ForbiddenError("Forbidden: You cannot view another patient's profile");
      }

      return sendSuccess(res, "Patient profile retrieved successfully", patient);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const patient = await patientService.getPatientById(id);

      const isStaffOrAdmin = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST"].includes(r)
      );
      const isSelf = patient.user_id === req.user.id;

      if (!isStaffOrAdmin && !isSelf) {
        throw new ForbiddenError("Forbidden: You cannot modify another patient's profile");
      }

      const updated = await patientService.updatePatient(id, req.body);
      return sendSuccess(res, "Patient profile updated successfully", updated);
    } catch (error) {
      return next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await patientService.deletePatient(id);
      return sendSuccess(res, "Patient profile deactivated successfully");
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const isStaffOrAdmin = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST"].includes(r)
      );

      if (!isStaffOrAdmin) {
        throw new ForbiddenError("Forbidden: Only staff members can register new patients");
      }

      const patient = await patientService.createPatient(req.body);
      return sendSuccess(res, "Patient profile registered successfully", patient, 201);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PatientController();
