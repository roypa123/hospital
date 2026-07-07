const db = require("../config/knex");

class DoctorRepository {
  async create(data) {
    const [doctor] = await db("doctors").insert(data).returning("*");
    return doctor;
  }

  async findById(id) {
    return await db("doctors")
      .join("users", "doctors.user_id", "users.id")
      .leftJoin("departments", "doctors.department_id", "departments.id")
      .where("doctors.id", id)
      .select(
        "doctors.*",
        "users.first_name",
        "users.last_name",
        "users.email",
        "departments.name as department_name"
      )
      .first();
  }

  async findByUserId(userId) {
    return await db("doctors")
      .join("users", "doctors.user_id", "users.id")
      .where("doctors.user_id", userId)
      .select("doctors.*", "users.first_name", "users.last_name", "users.email")
      .first();
  }

  async findAll(filters = {}) {
    const query = db("doctors")
      .join("users", "doctors.user_id", "users.id")
      .leftJoin("departments", "doctors.department_id", "departments.id")
      .select(
        "doctors.*",
        "users.first_name",
        "users.last_name",
        "users.email",
        "departments.name as department_name"
      );

    if (filters.department_id) {
      query.where("doctors.department_id", filters.department_id);
    }
    if (filters.specialization) {
      query.whereILike("doctors.specialization", `%${filters.specialization}%`);
    }
    if (filters.is_active !== undefined) {
      query.where("doctors.is_active", filters.is_active);
    } else {
      query.where("doctors.is_active", true);
    }

    return await query.orderBy("users.first_name", "asc");
  }

  async update(id, data) {
    const [doctor] = await db("doctors")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return doctor;
  }

  async deactivate(id) {
    const [doctor] = await db("doctors")
      .where({ id })
      .update({ is_active: false, updated_at: db.fn.now() })
      .returning("*");
    return doctor;
  }

  // --- SCHEDULES TEMPLATES MANAGEMENT ---

  async findSchedule(doctorId, dayOfWeek) {
    return await db("doctor_schedules")
      .where({ doctor_id: doctorId, day_of_week: dayOfWeek, is_active: true })
      .first();
  }

  async getSchedules(doctorId) {
    return await db("doctor_schedules")
      .where({ doctor_id: doctorId, is_active: true })
      .orderBy("day_of_week", "asc");
  }

  async createSchedule(data) {
    const [schedule] = await db("doctor_schedules").insert(data).returning("*");
    return schedule;
  }

  async updateSchedule(id, data) {
    const [schedule] = await db("doctor_schedules")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return schedule;
  }

  async deleteSchedule(id) {
    return await db("doctor_schedules").where({ id }).del();
  }
}

module.exports = new DoctorRepository();
