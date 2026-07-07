const labService = require("../services/lab.service");
const patientRepository = require("../repositories/patient.repository");
const { sendSuccess } = require("../shared/response");
const { ForbiddenError } = require("../shared/errors");

class LabController {
  async order(req, res, next) {
    try {
      const { patient_id } = req.body;
      const test = await labService.requestLabTest(patient_id, req.user.id, req.body);
      return sendSuccess(res, "Lab test ordered successfully", test, 201);
    } catch (error) {
      return next(error);
    }
  }

  async recordResults(req, res, next) {
    try {
      const { id } = req.params;
      const test = await labService.recordResults(id, req.user.id, req.body);
      return sendSuccess(res, "Lab test findings uploaded successfully", test);
    } catch (error) {
      return next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const { id } = req.params;
      const test = await labService.approveResults(id, req.user.id);
      return sendSuccess(res, "Lab test results approved successfully", test);
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const filters = {};
      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "LAB_TECHNICIAN"].includes(r)
      );

      // ABAC: Patients see only their own lab orders history
      if (!isStaff && req.user.roles.includes("PATIENT")) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient) {
          return sendSuccess(res, "Laboratory tests list", []);
        }
        filters.patient_id = patient.id;
      } else {
        if (req.query.patient_id) filters.patient_id = req.query.patient_id;
        if (req.query.doctor_id) filters.doctor_id = req.query.doctor_id;
        if (req.query.status) filters.status = req.query.status;
      }

      const list = await labService.getLabTests(filters);
      return sendSuccess(res, "Laboratory tests list retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async get(req, res, next) {
    try {
      const test = await labService.getLabTestById(req.params.id);

      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "LAB_TECHNICIAN"].includes(r)
      );

      // Verify access permission
      if (!isStaff) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient || patient.id !== test.patient_id) {
          throw new ForbiddenError("Forbidden: You cannot view another patient's laboratory test results");
        }
      }

      return sendSuccess(res, "Laboratory test details retrieved", test);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new LabController();
