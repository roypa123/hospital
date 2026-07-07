const db = require("../config/knex");

class TwoFactorRepository {
  async create(data) {
    const [record] = await db("two_factor_auth")
      .insert({
        user_id: data.user_id,
        secret: data.secret,
        enabled: data.enabled || false,
        backup_codes: JSON.stringify(data.backup_codes || []),
      })
      .returning("*");

    return record;
  }

  async findByUserId(userId) {
    return await db("two_factor_auth")
      .where({ user_id: userId })
      .first();
  }

  async update(userId, data) {
    const updateData = { ...data, updated_at: db.fn.now() };
    if (data.backup_codes) {
      updateData.backup_codes = JSON.stringify(data.backup_codes);
    }

    const [record] = await db("two_factor_auth")
      .where({ user_id: userId })
      .update(updateData)
      .returning("*");

    return record;
  }

  async delete(userId) {
    return await db("two_factor_auth")
      .where({ user_id: userId })
      .del();
  }
}

module.exports = new TwoFactorRepository();
