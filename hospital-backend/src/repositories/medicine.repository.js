const db = require("../config/knex");

class MedicineRepository {
  async create(data) {
    const [medicine] = await db("medicines").insert(data).returning("*");
    return medicine;
  }

  async findById(id) {
    return await db("medicines")
      .leftJoin("medicine_stock", "medicines.id", "medicine_stock.medicine_id")
      .select(
        "medicines.*",
        db.raw("COALESCE(SUM(medicine_stock.quantity), 0)::integer as stock_quantity")
      )
      .where("medicines.id", id)
      .groupBy("medicines.id")
      .first();
  }

  async findByName(name) {
    return await db("medicines").whereILike("name", name).first();
  }

  async findAll(filters = {}) {
    const query = db("medicines")
      .leftJoin("medicine_stock", "medicines.id", "medicine_stock.medicine_id")
      .select(
        "medicines.*",
        db.raw("COALESCE(SUM(medicine_stock.quantity), 0)::integer as stock_quantity")
      )
      .groupBy("medicines.id");

    if (filters.category) {
      query.where("medicines.category", filters.category);
    }
    if (filters.search) {
      query.where((builder) => {
        builder
          .whereILike("medicines.name", `%${filters.search}%`)
          .orWhereILike("medicines.generic_name", `%${filters.search}%`);
      });
    }
    if (filters.is_active !== undefined) {
      query.where("medicines.is_active", filters.is_active);
    } else {
      query.where("medicines.is_active", true);
    }

    return await query.orderBy("medicines.name", "asc");
  }

  async update(id, data) {
    const [medicine] = await db("medicines")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return medicine;
  }

  async deactivate(id) {
    const [medicine] = await db("medicines")
      .where({ id })
      .update({ is_active: false, updated_at: db.fn.now() })
      .returning("*");
    return medicine;
  }
}

module.exports = new MedicineRepository();
