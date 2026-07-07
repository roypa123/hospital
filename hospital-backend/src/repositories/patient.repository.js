const db = require("../config/knex");

class PatientRepository {
  async create(data) {
    const [patient] = await db("patients").insert(data).returning("*");
    return patient;
  }

  async findById(id) {
    return await db("patients")
      .join("users", "patients.user_id", "users.id")
      .where("patients.id", id)
      .select(
        "patients.*",
        "users.first_name",
        "users.last_name",
        "users.email",
        "users.email_verified"
      )
      .first();
  }

  async findByUserId(userId) {
    return await db("patients").where({ user_id: userId }).first();
  }

  async findAll(filters = {}) {
    const query = db("patients")
      .join("users", "patients.user_id", "users.id")
      .select(
        "patients.*",
        "users.first_name",
        "users.last_name",
        "users.email"
      );

    if (filters.gender) {
      query.where("patients.gender", filters.gender);
    }
    if (filters.blood_group) {
      query.where("patients.blood_group", filters.blood_group);
    }
    if (filters.search) {
      query.where((builder) => {
        builder
          .whereILike("users.first_name", `%${filters.search}%`)
          .orWhereILike("users.last_name", `%${filters.search}%`)
          .orWhereILike("users.email", `%${filters.search}%`);
      });
    }
    if (filters.is_active !== undefined) {
      query.where("patients.is_active", filters.is_active);
    } else {
      query.where("patients.is_active", true);
    }

    return await query.orderBy("users.first_name", "asc");
  }

  async update(id, data) {
    const updateData = { ...data, updated_at: db.fn.now() };
    
    // Stringify JSON/JSONB fields if they are passed as JS objects
    if (data.allergies && typeof data.allergies !== "string") {
      updateData.allergies = JSON.stringify(data.allergies);
    }
    if (data.emergency_contact && typeof data.emergency_contact !== "string") {
      updateData.emergency_contact = JSON.stringify(data.emergency_contact);
    }
    if (data.insurance_details && typeof data.insurance_details !== "string") {
      updateData.insurance_details = JSON.stringify(data.insurance_details);
    }

    const [patient] = await db("patients")
      .where({ id })
      .update(updateData)
      .returning("*");
    return patient;
  }

  async deactivate(id) {
    const [patient] = await db("patients")
      .where({ id })
      .update({ is_active: false, updated_at: db.fn.now() })
      .returning("*");
    return patient;
  }
}

module.exports = new PatientRepository();
