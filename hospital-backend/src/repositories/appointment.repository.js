const db = require("../config/knex");

class AppointmentRepository {
  // --- APPOINTMENT SLOTS DATA ACCESS ---

  async findSlotById(id) {
    return await db("appointment_slots").where({ id }).first();
  }

  async findSlotByIdWithLock(id, trx) {
    return await trx("appointment_slots").where({ id }).first();
  }

  async findSlotsByDoctorAndDate(doctorId, date) {
    return await db("appointment_slots")
      .where({ doctor_id: doctorId, date })
      .orderBy("start_time", "asc");
  }

  async createSlotsBulk(slotsArray, trx) {
    const query = trx || db;
    return await query("appointment_slots").insert(slotsArray).returning("*");
  }

  /**
   * Optimistically attempts to book an appointment slot.
   * Matches by ID, expected status 'available', and expected version.
   * Increments version and changes status to 'booked'.
   * @returns {Promise<boolean>} True if slot updated successfully, False if concurrent modification occurred.
   */
  async bookSlotOptimistic(slotId, currentVersion, trx) {
    const query = trx || db;
    const affectedRows = await query("appointment_slots")
      .where({
        id: slotId,
        version: currentVersion,
        status: "available",
      })
      .update({
        status: "booked",
        version: currentVersion + 1,
        updated_at: db.fn.now(),
      });

    return affectedRows > 0;
  }

  /**
   * Releases a slot back to available state (resets version/status)
   */
  async releaseSlot(slotId, trx) {
    const query = trx || db;
    return await query("appointment_slots")
      .where({ id: slotId })
      .update({
        status: "available",
        updated_at: db.fn.now(),
      });
  }

  // --- APPOINTMENTS DATA ACCESS ---

  async createAppointment(appointmentData, trx) {
    const query = trx || db;
    const [appointment] = await query("appointments")
      .insert(appointmentData)
      .returning("*");
    return appointment;
  }

  async findAppointmentById(id) {
    return await db("appointments")
      .join("patients", "appointments.patient_id", "patients.id")
      .join("users as patient_users", "patients.user_id", "patient_users.id")
      .join("doctors", "appointments.doctor_id", "doctors.id")
      .join("users as doctor_users", "doctors.user_id", "doctor_users.id")
      .join("appointment_slots", "appointments.slot_id", "appointment_slots.id")
      .where("appointments.id", id)
      .select(
        "appointments.*",
        "patient_users.first_name as patient_first_name",
        "patient_users.last_name as patient_last_name",
        "patient_users.email as patient_email",
        "doctor_users.first_name as doctor_first_name",
        "doctor_users.last_name as doctor_last_name",
        "appointment_slots.start_time",
        "appointment_slots.end_time"
      )
      .first();
  }

  async findAppointments(filters = {}) {
    const query = db("appointments")
      .join("patients", "appointments.patient_id", "patients.id")
      .join("users as patient_users", "patients.user_id", "patient_users.id")
      .join("doctors", "appointments.doctor_id", "doctors.id")
      .join("users as doctor_users", "doctors.user_id", "doctor_users.id")
      .join("appointment_slots", "appointments.slot_id", "appointment_slots.id")
      .select(
        "appointments.*",
        "patient_users.first_name as patient_first_name",
        "patient_users.last_name as patient_last_name",
        "doctor_users.first_name as doctor_first_name",
        "doctor_users.last_name as doctor_last_name",
        "appointment_slots.start_time",
        "appointment_slots.end_time"
      );

    if (filters.patient_id) {
      query.where("appointments.patient_id", filters.patient_id);
    }
    if (filters.doctor_id) {
      query.where("appointments.doctor_id", filters.doctor_id);
    }
    if (filters.date) {
      query.where("appointments.appointment_date", filters.date);
    }
    if (filters.status) {
      query.where("appointments.status", filters.status);
    }

    return await query.orderBy([
      { column: "appointments.appointment_date", order: "desc" },
      { column: "appointment_slots.start_time", order: "asc" },
    ]);
  }

  async updateAppointment(id, data, trx) {
    const query = trx || db;
    const [appointment] = await query("appointments")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return appointment;
  }
}

module.exports = new AppointmentRepository();
