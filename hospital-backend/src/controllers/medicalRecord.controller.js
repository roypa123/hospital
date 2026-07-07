const medicalRecordService = require("../services/medicalRecord.service");
const doctorRepository = require("../repositories/doctor.repository");
const patientRepository = require("../repositories/patient.repository");
const { sendSuccess } = require("../shared/response");
const { ForbiddenError, NotFoundError } = require("../shared/errors");

class MedicalRecordController {
  async create(req, res, next) {
    try {
      // 1. Resolve logged-in doctor profile
      const doctor = await doctorRepository.findByUserId(req.user.id);
      if (!doctor) {
        throw new ForbiddenError("Forbidden: Only registered doctors can create medical records");
      }

      const recordData = {
        ...req.body,
        doctor_id: doctor.id, // Enforce logged-in doctor
      };

      const record = await medicalRecordService.createMedicalRecord(recordData);
      return sendSuccess(res, "Medical record created successfully", record, 201);
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const filters = {};
      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"].includes(r)
      );

      // ABAC: Patients see only their own medical history
      if (!isStaff && req.user.roles.includes("PATIENT")) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient) {
          return sendSuccess(res, "Medical records list", []);
        }
        filters.patient_id = patient.id;
      } else {
        if (req.query.patient_id) filters.patient_id = req.query.patient_id;
        if (req.query.doctor_id) filters.doctor_id = req.query.doctor_id;
      }

      const list = await medicalRecordService.getMedicalRecords(filters);
      return sendSuccess(res, "Medical records list retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async get(req, res, next) {
    try {
      const record = await medicalRecordService.getMedicalRecordById(req.params.id);

      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"].includes(r)
      );

      // Check access permission
      if (!isStaff) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient || patient.id !== record.patient_id) {
          throw new ForbiddenError("Forbidden: You cannot view another patient's medical records");
        }
      }

      return sendSuccess(res, "Medical record details retrieved", record);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new MedicalRecordController();
