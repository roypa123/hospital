const db = require("../config/knex");

class SessionRepository {
  async create(data) {
    const [session] = await db("user_sessions")
      .insert(data)
      .returning("*");

    return session;
  }

  async findById(id) {
    return await db("user_sessions")
      .where({ id })
      .first();
  }

  async findActiveByUser(userId) {
    return await db("user_sessions")
      .where({
        user_id: userId,
        is_active: true,
      })
      .orderBy("login_at", "desc");
  }

  async countActive(userId) {
    const result = await db("user_sessions")
      .where({
        user_id: userId,
        is_active: true,
      })
      .count("* as total")
      .first();

    return Number(result.total);
  }

  async updateActivity(id) {
    const [session] = await db("user_sessions")
      .where({ id })
      .update({
        last_activity: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    return session;
  }

  async close(id) {
    const [session] = await db("user_sessions")
      .where({ id })
      .update({
        is_active: false,
        logout_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    return session;
  }

  async closeAll(userId) {
    return await db("user_sessions")
      .where({
        user_id: userId,
        is_active: true,
      })
      .update({
        is_active: false,
        logout_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
  }
}

module.exports = new SessionRepository();