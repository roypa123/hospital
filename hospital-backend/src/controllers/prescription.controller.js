const prescriptionService = require("../services/prescription.service");
const patientRepository = require("../repositories/patient.repository");
const { sendSuccess } = require("../shared/response");
const { ForbiddenError } = require("../shared/errors");

class PrescriptionController {
  async create(req, res, next) {
    try {
      // 1. Write prescription (req.user.id is doctor user id)
      const prescription = await prescriptionService.writePrescription(req.user.id, req.body);
      return sendSuccess(res, "Prescription written and signed successfully", prescription, 201);
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const filters = {};
      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "PHARMACIST"].includes(r)
      );

      // ABAC: Patients see only their own prescriptions list
      if (!isStaff && req.user.roles.includes("PATIENT")) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient) {
          return sendSuccess(res, "Prescriptions list", []);
        }
        filters.patient_id = patient.id;
      } else {
        if (req.query.patient_id) filters.patient_id = req.query.patient_id;
        if (req.query.doctor_id) filters.doctor_id = req.query.doctor_id;
        if (req.query.medical_record_id) filters.medical_record_id = req.query.medical_record_id;
      }

      const list = await prescriptionService.getPrescriptions(filters);
      return sendSuccess(res, "Prescriptions list retrieved successfully", list);
    } catch (error) {
      return next(error);
    }
  }

  async get(req, res, next) {
    try {
      const prescription = await prescriptionService.getPrescriptionById(req.params.id);

      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "PHARMACIST"].includes(r)
      );

      // Verify access permission
      if (!isStaff) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient || patient.id !== prescription.patient_id) {
          throw new ForbiddenError("Forbidden: You cannot view another patient's prescriptions");
        }
      }

      return sendSuccess(res, "Prescription details retrieved", prescription);
    } catch (error) {
      return next(error);
    }
  }

  async refill(req, res, next) {
    try {
      const { id } = req.params;
      const { itemId } = req.body;

      // Only Doctor or Pharmacist/Cashier/Admin can process refills
      const isEligible = req.user.roles.some((r) =>
        ["ADMIN", "DOCTOR", "PHARMACIST", "CASHIER"].includes(r)
      );

      if (!isEligible) {
        throw new ForbiddenError("Forbidden: You are not authorized to approve refills");
      }

      const updated = await prescriptionService.refillPrescription(id, itemId);
      return sendSuccess(res, "Refill approved successfully", updated);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PrescriptionController();
