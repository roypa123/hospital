const db = require("../config/knex");

class DashboardRepository {
  // --- Admin Queries ---
  async getAdminCounts() {
    const patients = await db("patients").count("id as count").first();
    const doctors = await db("doctors").count("id as count").first();
    const appointments = await db("appointments").count("id as count").first();
    const medicines = await db("medicines").count("id as count").first();

    return {
      total_patients: parseInt(patients.count || 0, 10),
      total_doctors: parseInt(doctors.count || 0, 10),
      total_appointments: parseInt(appointments.count || 0, 10),
      total_medicines: parseInt(medicines.count || 0, 10),
    };
  }

  async getAdminBillingRevenue() {
    const revenue = await db("bills")
      .select(
        db.raw("COALESCE(SUM(total_amount), 0) as total_billed"),
        db.raw("COALESCE(SUM(discount_amount), 0) as total_discounts"),
        db.raw("COALESCE(SUM(tax_amount), 0) as total_taxes"),
        db.raw("COALESCE(SUM(net_amount), 0) as total_net"),
        db.raw("COALESCE(SUM(paid_amount), 0) as total_paid")
      )
      .first();

    const billed = parseFloat(revenue.total_billed);
    const discounts = parseFloat(revenue.total_discounts);
    const taxes = parseFloat(revenue.total_taxes);
    const net = parseFloat(revenue.total_net);
    const paid = parseFloat(revenue.total_paid);

    return {
      total_billed: billed,
      total_discounts: discounts,
      total_taxes: taxes,
      total_net: net,
      total_paid: paid,
      total_outstanding: Math.max(0, net - paid),
    };
  }

  async getAdminAppointmentsByStatus() {
    const list = await db("appointments")
      .select("status")
      .count("id as count")
      .groupBy("status");

    const result = {
      scheduled: 0,
      checked_in: 0,
      consultation: 0,
      completed: 0,
      cancelled: 0,
    };

    list.forEach((item) => {
      if (result[item.status] !== undefined) {
        result[item.status] = parseInt(item.count || 0, 10);
      }
    });

    return result;
  }

  async getAdminRevenueByPaymentMethod() {
    return await db("payments")
      .select("payment_method")
      .sum("amount as total_amount")
      .groupBy("payment_method");
  }

  // --- Doctor Queries ---
  async getDoctorSummary(doctorId) {
    const total = await db("appointments")
      .where({ doctor_id: doctorId })
      .count("id as count")
      .first();

    const completed = await db("appointments")
      .where({ doctor_id: doctorId, status: "completed" })
      .count("id as count")
      .first();

    const labsPending = await db("lab_tests")
      .where({ doctor_id: doctorId, status: "completed" }) // Technician uploaded results but doctor hasn't approved
      .count("id as count")
      .first();

    return {
      total_appointments: parseInt(total.count || 0, 10),
      completed_appointments: parseInt(completed.count || 0, 10),
      pending_lab_reviews: parseInt(labsPending.count || 0, 10),
    };
  }

  async getDoctorUpcomingRoster(doctorId, limit = 5) {
    return await db("appointments")
      .join("patients", "appointments.patient_id", "patients.id")
      .join("users", "patients.user_id", "users.id")
      .join("appointment_slots", "appointments.slot_id", "appointment_slots.id")
      .where("appointments.doctor_id", doctorId)
      .andWhere("appointments.status", "scheduled")
      .select(
        "appointments.id as appointment_id",
        "appointment_slots.date",
        "appointment_slots.start_time",
        "appointment_slots.end_time",
        "users.first_name as patient_first_name",
        "users.last_name as patient_last_name",
        "appointments.visit_type"
      )
      .orderBy("appointment_slots.date", "asc")
      .orderBy("appointment_slots.start_time", "asc")
      .limit(limit);
  }

  // --- Patient Queries ---
  async getPatientSummary(patientId) {
    const bills = await db("bills")
      .where({ patient_id: patientId })
      .whereIn("status", ["unpaid", "partially_paid"])
      .count("id as count")
      .first();

    const prescriptions = await db("prescriptions")
      .where({ patient_id: patientId })
      .count("id as count")
      .first();

    const EMRs = await db("medical_records")
      .where({ patient_id: patientId })
      .count("id as count")
      .first();

    return {
      unpaid_bills_count: parseInt(bills.count || 0, 10),
      total_prescriptions: parseInt(prescriptions.count || 0, 10),
      total_visits: parseInt(EMRs.count || 0, 10),
    };
  }

  async getPatientVitalsTimeline(patientId) {
    return await db("medical_records")
      .where({ patient_id: patientId })
      .select("id", "vital_signs", "created_at")
      .orderBy("created_at", "asc");
  }
}

module.exports = new DashboardRepository();
