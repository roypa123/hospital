const db = require("../config/knex");

class PharmacyRepository {
  /**
   * Retrieves stock batches for a medicine, ordered by expiry date (FEFO - First Expiry First Out)
   */
  async findStockByMedicineId(medicineId, trx) {
    const query = trx || db;
    return await query("medicine_stock")
      .where("medicine_id", medicineId)
      .andWhere("expiry_date", ">", db.fn.now())
      .andWhere("quantity", ">", 0)
      .orderBy("expiry_date", "asc");
  }

  async findStockByMedicineIdWithLock(medicineId, trx) {
    return await trx("medicine_stock")
      .where("medicine_id", medicineId)
      .andWhere("expiry_date", ">", db.fn.now())
      .andWhere("quantity", ">", 0)
      .orderBy("expiry_date", "asc")
      .forUpdate(); // Locks rows for update in transaction
  }

  async createStock(data) {
    const [stock] = await db("medicine_stock").insert(data).returning("*");
    return stock;
  }

  async updateStockQuantity(id, quantity, trx) {
    const query = trx || db;
    const [updated] = await query("medicine_stock")
      .where({ id })
      .update({ quantity, updated_at: db.fn.now() })
      .returning("*");
    return updated;
  }

  async createDispense(data, trx) {
    const query = trx || db;
    const [dispense] = await query("medicine_dispenses")
      .insert(data)
      .returning("*");
    return dispense;
  }

  async createDispenseItemsBulk(items, trx) {
    const query = trx || db;
    return await query("medicine_dispense_items").insert(items).returning("*");
  }

  async getDispenses(filters = {}) {
    const query = db("medicine_dispenses")
      .join("prescriptions", "medicine_dispenses.prescription_id", "prescriptions.id")
      .join("users as pharmacist_users", "medicine_dispenses.pharmacist_user_id", "pharmacist_users.id")
      .select(
        "medicine_dispenses.*",
        "prescriptions.digital_signature",
        "pharmacist_users.first_name as pharmacist_first_name",
        "pharmacist_users.last_name as pharmacist_last_name"
      );

    if (filters.prescription_id) {
      query.where("medicine_dispenses.prescription_id", filters.prescription_id);
    }
    
    return await query.orderBy("medicine_dispenses.dispensed_at", "desc");
  }

  async findDispenseById(id) {
    const dispense = await db("medicine_dispenses")
      .join("users as pharmacist", "medicine_dispenses.pharmacist_user_id", "pharmacist.id")
      .where("medicine_dispenses.id", id)
      .select(
        "medicine_dispenses.*",
        "pharmacist.first_name as pharmacist_first_name",
        "pharmacist.last_name as pharmacist_last_name"
      )
      .first();

    if (!dispense) return null;

    const items = await db("medicine_dispense_items")
      .join("medicines", "medicine_dispense_items.medicine_id", "medicines.id")
      .where({ dispense_id: id })
      .select("medicine_dispense_items.*", "medicines.name as medicine_name");
      
    dispense.items = items;
    return dispense;
  }

  async getAllStock(filters = {}) {
    const query = db("medicine_stock")
      .join("medicines", "medicine_stock.medicine_id", "medicines.id")
      .select("medicine_stock.*", "medicines.name as medicine_name");

    if (filters.low_stock === "true" || filters.low_stock === true) {
      query.where("medicine_stock.quantity", "<", 20);
    }

    return await query.orderBy("medicine_stock.expiry_date", "asc");
  }
}

module.exports = new PharmacyRepository();
