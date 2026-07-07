const db = require("../db/knex");

class RefreshTokenRepository {
  async create(data) {
    const [token] = await db("refresh_tokens")
      .insert(data)
      .returning("*");

    return token;
  }

  async findByToken(token) {
    return await db("refresh_tokens")
      .where({
        token,
        revoked: false,
      })
      .first();
  }

  async revoke(id) {
    const [token] = await db("refresh_tokens")
      .where({ id })
      .update({
        revoked: true,
        updated_at: db.fn.now(),
      })
      .returning("*");

    return token;
  }

  async revokeAllByUser(userId) {
    return await db("refresh_tokens")
      .where({
        user_id: userId,
        revoked: false,
      })
      .update({
        revoked: true,
        updated_at: db.fn.now(),
      });
  }

  async deleteExpired() {
    return await db("refresh_tokens")
      .where("expires_at", "<", db.fn.now())
      .del();
  }
}

module.exports = new RefreshTokenRepository();