const db = require("../config/knex");

class MedicalRecordRepository {
  async create(data, trx) {
    const query = trx || db;
    const [record] = await query("medical_records")
      .insert({
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        appointment_id: data.appointment_id || null,
        symptoms: data.symptoms,
        diagnosis: data.diagnosis,
        vital_signs: typeof data.vital_signs === "string" ? data.vital_signs : JSON.stringify(data.vital_signs || {}),
        clinical_notes: data.clinical_notes,
        treatment_plan: data.treatment_plan,
      })
      .returning("*");
    return record;
  }

  async findById(id) {
    return await db("medical_records")
      .join("patients", "medical_records.patient_id", "patients.id")
      .join("users as patient_users", "patients.user_id", "patient_users.id")
      .join("doctors", "medical_records.doctor_id", "doctors.id")
      .join("users as doctor_users", "doctors.user_id", "doctor_users.id")
      .where("medical_records.id", id)
      .select(
        "medical_records.*",
        "patient_users.first_name as patient_first_name",
        "patient_users.last_name as patient_last_name",
        "doctor_users.first_name as doctor_first_name",
        "doctor_users.last_name as doctor_last_name"
      )
      .first();
  }

  async findByPatientId(patientId) {
    return await db("medical_records")
      .join("doctors", "medical_records.doctor_id", "doctors.id")
      .join("users as doctor_users", "doctors.user_id", "doctor_users.id")
      .where("medical_records.patient_id", patientId)
      .select(
        "medical_records.*",
        "doctor_users.first_name as doctor_first_name",
        "doctor_users.last_name as doctor_last_name"
      )
      .orderBy("medical_records.created_at", "desc");
  }

  async findAll(filters = {}) {
    const query = db("medical_records")
      .join("patients", "medical_records.patient_id", "patients.id")
      .join("users as patient_users", "patients.user_id", "patient_users.id")
      .join("doctors", "medical_records.doctor_id", "doctors.id")
      .join("users as doctor_users", "doctors.user_id", "doctor_users.id")
      .select(
        "medical_records.*",
        "patient_users.first_name as patient_first_name",
        "patient_users.last_name as patient_last_name",
        "doctor_users.first_name as doctor_first_name",
        "doctor_users.last_name as doctor_last_name"
      );

    if (filters.patient_id) {
      query.where("medical_records.patient_id", filters.patient_id);
    }
    if (filters.doctor_id) {
      query.where("medical_records.doctor_id", filters.doctor_id);
    }
    
    return await query.orderBy("medical_records.created_at", "desc");
  }
}

module.exports = new MedicalRecordRepository();
