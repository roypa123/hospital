const db = require("../config/knex");

class DepartmentRepository {
  async create(data) {
    const [department] = await db("departments")
      .insert(data)
      .returning("*");
    return department;
  }

  async findAll(includeInactive = false) {
    const query = db("departments");
    if (!includeInactive) {
      query.where({ is_active: true });
    }
    return await query.orderBy("name", "asc");
  }

  async findById(id) {
    return await db("departments")
      .where({ id })
      .first();
  }

  async findByCode(code) {
    return await db("departments")
      .where({ code: code.toUpperCase() })
      .first();
  }

  async update(id, data) {
    const [department] = await db("departments")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return department;
  }

  async deactivate(id) {
    const [department] = await db("departments")
      .where({ id })
      .update({ is_active: false, updated_at: db.fn.now() })
      .returning("*");
    return department;
  }
}

module.exports = new DepartmentRepository();
