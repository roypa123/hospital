const db = require("../config/knex");

class NotificationRepository {
  async create(data) {
    const [notif] = await db("notifications").insert(data).returning("*");
    return notif;
  }

  async findByUserId(userId) {
    return await db("notifications")
      .where({ user_id: userId })
      .orderBy("created_at", "desc");
  }

  async markAsRead(id, userId) {
    const [updated] = await db("notifications")
      .where({ id, user_id: userId })
      .update({ is_read: true })
      .returning("*");
    return updated;
  }

  async markAllAsRead(userId) {
    return await db("notifications")
      .where({ user_id: userId, is_read: false })
      .update({ is_read: true })
      .returning("*");
  }
}

module.exports = new NotificationRepository();
