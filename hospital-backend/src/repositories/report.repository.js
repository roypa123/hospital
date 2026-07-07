const db = require("../config/knex");

class ReportRepository {
  async getFinancialOverview(startDate, endDate) {
    const summary = await db("bills")
      .select(
        db.raw("COALESCE(SUM(total_amount), 0) as total_billed"),
        db.raw("COALESCE(SUM(discount_amount), 0) as total_discounts"),
        db.raw("COALESCE(SUM(tax_amount), 0) as total_taxes"),
        db.raw("COALESCE(SUM(net_amount), 0) as total_net"),
        db.raw("COALESCE(SUM(paid_amount), 0) as total_paid")
      )
      .whereBetween("created_at", [startDate, endDate])
      .first();

    const bills = await db("bills")
      .join("patients", "bills.patient_id", "patients.id")
      .join("users", "patients.user_id", "users.id")
      .select(
        "bills.id",
        "users.first_name as patient_first_name",
        "users.last_name as patient_last_name",
        "bills.net_amount",
        "bills.paid_amount",
        "bills.status",
        "bills.created_at"
      )
      .whereBetween("bills.created_at", [startDate, endDate])
      .orderBy("bills.created_at", "desc");

    return {
      summary: {
        total_billed: parseFloat(summary.total_billed),
        total_discounts: parseFloat(summary.total_discounts),
        total_taxes: parseFloat(summary.total_taxes),
        total_net: parseFloat(summary.total_net),
        total_paid: parseFloat(summary.total_paid),
        total_outstanding: Math.max(0, parseFloat(summary.total_net) - parseFloat(summary.total_paid)),
      },
      records: bills,
    };
  }

  async getClinicalActivity(startDate, endDate) {
    return await db("doctors")
      .join("users", "doctors.user_id", "users.id")
      .leftJoin("appointments", function () {
        this.on("doctors.id", "=", "appointments.doctor_id").andOnBetween(
          "appointments.appointment_date",
          [startDate, endDate]
        );
      })
      .select(
        "doctors.id as doctor_id",
        "users.first_name as doctor_first_name",
        "users.last_name as doctor_last_name",
        db.raw("COUNT(appointments.id) as total_appointments"),
        db.raw(
          "COUNT(CASE WHEN appointments.status = 'completed' THEN 1 END) as completed_appointments"
        )
      )
      .groupBy("doctors.id", "users.first_name", "users.last_name")
      .orderBy("total_appointments", "desc");
  }

  async getInventoryConsumption() {
    const consumption = await db("medicine_dispense_items")
      .select("medicine_id")
      .sum("quantity_dispensed as total_dispensed")
      .groupBy("medicine_id");

    const stock = await db("medicine_stock")
      .select("medicine_id")
      .sum("quantity as remaining_stock")
      .groupBy("medicine_id");

    const medicines = await db("medicines").select("id", "name");

    return medicines.map((med) => {
      const cons = consumption.find((c) => c.medicine_id === med.id);
      const stk = stock.find((s) => s.medicine_id === med.id);
      return {
        medicine_id: med.id,
        medicine_name: med.name,
        total_dispensed: parseInt(cons ? cons.total_dispensed : 0, 10),
        remaining_stock: parseInt(stk ? stk.remaining_stock : 0, 10),
      };
    });
  }
}

module.exports = new ReportRepository();
