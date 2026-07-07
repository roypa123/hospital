const db = require("../config/knex");

class BillingRepository {
  async create(data, trx) {
    const query = trx || db;
    const [bill] = await query("bills")
      .insert({
        patient_id: data.patient_id,
        appointment_id: data.appointment_id || null,
        total_amount: data.total_amount || 0,
        discount_amount: data.discount_amount || 0,
        tax_amount: data.tax_amount || 0,
        net_amount: data.net_amount || 0,
        paid_amount: data.paid_amount || 0,
        status: data.status || "unpaid",
      })
      .returning("*");
    return bill;
  }

  async createItemsBulk(items, trx) {
    const query = trx || db;
    return await query("bill_items").insert(items).returning("*");
  }

  async createPayment(paymentData, trx) {
    const query = trx || db;
    const [payment] = await query("payments").insert(paymentData).returning("*");
    return payment;
  }

  async updateBill(id, data, trx) {
    const query = trx || db;
    const [bill] = await query("bills")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return bill;
  }

  async findById(id) {
    const bill = await db("bills")
      .join("patients", "bills.patient_id", "patients.id")
      .join("users as patient_users", "patients.user_id", "patient_users.id")
      .where("bills.id", id)
      .select(
        "bills.*",
        "patient_users.first_name as patient_first_name",
        "patient_users.last_name as patient_last_name",
        "patient_users.email as patient_email"
      )
      .first();

    if (!bill) return null;

    const items = await db("bill_items").where({ bill_id: id }).orderBy("created_at", "asc");
    const payments = await db("payments").where({ bill_id: id }).orderBy("paid_at", "desc");

    bill.items = items;
    bill.payments = payments;

    return bill;
  }

  async findAll(filters = {}) {
    const query = db("bills")
      .join("patients", "bills.patient_id", "patients.id")
      .join("users as patient_users", "patients.user_id", "patient_users.id")
      .select(
        "bills.*",
        "patient_users.first_name as patient_first_name",
        "patient_users.last_name as patient_last_name"
      );

    if (filters.patient_id) {
      query.where("bills.patient_id", filters.patient_id);
    }
    if (filters.status) {
      query.where("bills.status", filters.status);
    }
    
    return await query.orderBy("bills.created_at", "desc");
  }
}

module.exports = new BillingRepository();
