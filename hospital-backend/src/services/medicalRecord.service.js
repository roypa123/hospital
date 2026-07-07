const db = require("../config/knex");
const medicalRecordRepository = require("../repositories/medicalRecord.repository");
const appointmentRepository = require("../repositories/appointment.repository");
const { NotFoundError, BadRequestError } = require("../shared/errors");

class MedicalRecordService {
  async createMedicalRecord(data) {
    const { patient_id, doctor_id, appointment_id } = data;

    // Validate vital signs format if provided
    if (data.vital_signs) {
      const { blood_pressure, heart_rate, temperature } = data.vital_signs;
      if (blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(blood_pressure)) {
        throw new BadRequestError("Blood pressure must be in standard format (e.g. 120/80)");
      }
    }

    return await db.transaction(async (trx) => {
      // 1. If appointment_id is present, handle auto-completion
      if (appointment_id) {
        const appointment = await appointmentRepository.findAppointmentById(appointment_id);
        if (!appointment) {
          throw new NotFoundError("Linked appointment not found");
        }
        
        // Advance appointment status to completed
        const completedStatuses = ["completed", "cancelled"];
        if (!completedStatuses.includes(appointment.status)) {
          // If checked_in / consultation / scheduled, force transition to completed
          await appointmentRepository.updateAppointment(appointment_id, { status: "completed" }, trx);
        }
      }

      // 2. Insert clinical record
      return await medicalRecordRepository.create(data, trx);
    });
  }

  async getMedicalRecords(filters = {}) {
    return await medicalRecordRepository.findAll(filters);
  }

  async getPatientHistory(patientId) {
    return await medicalRecordRepository.findByPatientId(patientId);
  }

  async getMedicalRecordById(id) {
    const record = await medicalRecordRepository.findById(id);
    if (!record) {
      throw new NotFoundError("Clinical record not found");
    }
    return record;
  }
}

module.exports = new MedicalRecordService();
