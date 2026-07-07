const db = require("../config/knex");

class PrescriptionRepository {
  async create(data, trx) {
    const query = trx || db;
    const [prescription] = await query("prescriptions")
      .insert({
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        medical_record_id: data.medical_record_id || null,
        notes: data.notes,
        digital_signature: data.digital_signature,
      })
      .returning("*");
    return prescription;
  }

  async createItemsBulk(items, trx) {
    const query = trx || db;
    return await query("prescription_items").insert(items).returning("*");
  }

  async findById(id) {
    const prescription = await db("prescriptions")
      .join("patients", "prescriptions.patient_id", "patients.id")
      .join("users as patient_users", "patients.user_id", "patient_users.id")
      .join("doctors", "prescriptions.doctor_id", "doctors.id")
      .join("users as doctor_users", "doctors.user_id", "doctor_users.id")
      .leftJoin("medical_records", "prescriptions.medical_record_id", "medical_records.id")
      .where("prescriptions.id", id)
      .select(
        "prescriptions.*",
        "patient_users.first_name as patient_first_name",
        "patient_users.last_name as patient_last_name",
        "doctor_users.first_name as doctor_first_name",
        "doctor_users.last_name as doctor_last_name",
        "medical_records.diagnosis"
      )
      .first();

    if (!prescription) return null;

    const items = await this.findItemsByPrescriptionId(id);
    prescription.items = items;

    return prescription;
  }

  async findItemsByPrescriptionId(prescriptionId) {
    return await db("prescription_items")
      .leftJoin("medicines", "prescription_items.medicine_id", "medicines.id")
      .where({ prescription_id: prescriptionId })
      .select(
        "prescription_items.*",
        "medicines.name as medicine_name",
        "medicines.generic_name",
        "medicines.strength",
        "medicines.form"
      )
      .orderBy("prescription_items.created_at", "asc");
  }

  async findByPatientId(patientId) {
    return await db("prescriptions")
      .join("doctors", "prescriptions.doctor_id", "doctors.id")
      .join("users as doctor_users", "doctors.user_id", "doctor_users.id")
      .where("prescriptions.patient_id", patientId)
      .select(
        "prescriptions.*",
        "doctor_users.first_name as doctor_first_name",
        "doctor_users.last_name as doctor_last_name"
      )
      .orderBy("prescriptions.created_at", "desc");
  }

  async findAll(filters = {}) {
    const query = db("prescriptions")
      .join("patients", "prescriptions.patient_id", "patients.id")
      .join("users as patient_users", "patients.user_id", "patient_users.id")
      .join("doctors", "prescriptions.doctor_id", "doctors.id")
      .join("users as doctor_users", "doctors.user_id", "doctor_users.id")
      .select(
        "prescriptions.*",
        "patient_users.first_name as patient_first_name",
        "patient_users.last_name as patient_last_name",
        "doctor_users.first_name as doctor_first_name",
        "doctor_users.last_name as doctor_last_name"
      );

    if (filters.patient_id) {
      query.where("prescriptions.patient_id", filters.patient_id);
    }
    if (filters.doctor_id) {
      query.where("prescriptions.doctor_id", filters.doctor_id);
    }
    if (filters.medical_record_id) {
      query.where("prescriptions.medical_record_id", filters.medical_record_id);
    }

    return await query.orderBy("prescriptions.created_at", "desc");
  }
}

module.exports = new PrescriptionRepository();
