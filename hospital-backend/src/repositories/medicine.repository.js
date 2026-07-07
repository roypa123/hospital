const db = require("../config/knex");

class MedicineRepository {
  async create(data) {
    const [medicine] = await db("medicines").insert(data).returning("*");
    return medicine;
  }

  async findById(id) {
    return await db("medicines").where({ id }).first();
  }

  async findByName(name) {
    return await db("medicines").whereILike("name", name).first();
  }

  async findAll(filters = {}) {
    const query = db("medicines");

    if (filters.category) {
      query.where("category", filters.category);
    }
    if (filters.search) {
      query.where((builder) => {
        builder
          .whereILike("name", `%${filters.search}%`)
          .orWhereILike("generic_name", `%${filters.search}%`);
      });
    }
    if (filters.is_active !== undefined) {
      query.where("is_active", filters.is_active);
    } else {
      query.where("is_active", true);
    }

    return await query.orderBy("name", "asc");
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
