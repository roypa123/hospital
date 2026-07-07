const db = require("../config/knex");

class PasswordResetRepository {
  async create(data) {
    const [record] = await db("password_resets")
      .insert({
        email: data.email,
        token: data.token,
        expires_at: data.expires_at,
        used: false,
      })
      .returning("*");

    return record;
  }

  async findByToken(token) {
    return await db("password_resets")
      .where({ token, used: false })
      .first();
  }

  async markAsUsed(id) {
    const [record] = await db("password_resets")
      .where({ id })
      .update({
        used: true,
        updated_at: db.fn.now(),
      })
      .returning("*");

    return record;
  }

  async invalidateAllForEmail(email) {
    return await db("password_resets")
      .where({ email, used: false })
      .update({
        used: true,
        updated_at: db.fn.now(),
      });
  }
}

module.exports = new PasswordResetRepository();
