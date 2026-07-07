const db = require("../config/knex");

class LabRepository {
  async create(data, trx) {
    const query = trx || db;
    const [test] = await query("lab_tests").insert(data).returning("*");
    return test;
  }

  async findById(id) {
    return await db("lab_tests")
      .join("patients", "lab_tests.patient_id", "patients.id")
      .join("users as patient_users", "patients.user_id", "patient_users.id")
      .join("doctors", "lab_tests.doctor_id", "doctors.id")
      .join("users as doctor_users", "doctors.user_id", "doctor_users.id")
      .leftJoin("users as tech_users", "lab_tests.lab_technician_id", "tech_users.id")
      .leftJoin("doctors as approvers", "lab_tests.approved_by", "approvers.id")
      .leftJoin("users as approver_users", "approvers.user_id", "approver_users.id")
      .where("lab_tests.id", id)
      .select(
        "lab_tests.*",
        "patient_users.first_name as patient_first_name",
        "patient_users.last_name as patient_last_name",
        "doctor_users.first_name as doctor_first_name",
        "doctor_users.last_name as doctor_last_name",
        "tech_users.first_name as tech_first_name",
        "tech_users.last_name as tech_last_name",
        "approver_users.first_name as approver_first_name",
        "approver_users.last_name as approver_last_name"
      )
      .first();
  }

  async findAll(filters = {}) {
    const query = db("lab_tests")
      .join("patients", "lab_tests.patient_id", "patients.id")
      .join("users as patient_users", "patients.user_id", "patient_users.id")
      .join("doctors", "lab_tests.doctor_id", "doctors.id")
      .join("users as doctor_users", "doctors.user_id", "doctor_users.id")
      .select(
        "lab_tests.*",
        "patient_users.first_name as patient_first_name",
        "patient_users.last_name as patient_last_name",
        "doctor_users.first_name as doctor_first_name",
        "doctor_users.last_name as doctor_last_name"
      );

    if (filters.patient_id) {
      query.where("lab_tests.patient_id", filters.patient_id);
    }
    if (filters.doctor_id) {
      query.where("lab_tests.doctor_id", filters.doctor_id);
    }
    if (filters.status) {
      query.where("lab_tests.status", filters.status);
    }

    return await query.orderBy("lab_tests.created_at", "desc");
  }

  async update(id, data, trx) {
    const query = trx || db;
    const [updated] = await query("lab_tests")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return updated;
  }
}

module.exports = new LabRepository();
