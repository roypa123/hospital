const db = require("../config/knex");

class EmailVerificationRepository {
  async create(data) {
    const [record] = await db("email_verifications")
      .insert({
        user_id: data.user_id,
        token: data.token,
        expires_at: data.expires_at,
        used: false,
      })
      .returning("*");

    return record;
  }

  async findByToken(token) {
    return await db("email_verifications")
      .where({ token, used: false })
      .first();
  }

  async markAsUsed(id) {
    const [record] = await db("email_verifications")
      .where({ id })
      .update({
        used: true,
        updated_at: db.fn.now(),
      })
      .returning("*");

    return record;
  }

  async invalidateAllForUser(userId) {
    return await db("email_verifications")
      .where({ user_id: userId, used: false })
      .update({
        used: true,
        updated_at: db.fn.now(),
      });
  }
}

module.exports = new EmailVerificationRepository();
