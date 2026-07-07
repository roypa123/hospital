const db = require("../db/knex");

class UserRepository {
  async create(user) {
    const [createdUser] = await db("users")
      .insert(user)
      .returning("*");

    return createdUser;
  }

  async findById(id) {
    const user = await db("users")
      .where({ id })
      .first();

    return user;
  }

  async findByEmail(email) {
    const user = await db("users")
      .where({ email })
      .first();

    return user;
  }

  async updateLastLogin(id) {
    const [user] = await db("users")
      .where({ id })
      .update({
        last_login: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    return user;
  }

  async updatePassword(id, passwordHash) {
    const [user] = await db("users")
      .where({ id })
      .update({
        password_hash: passwordHash,
        updated_at: db.fn.now(),
      })
      .returning("*");

    return user;
  }

  async verifyEmail(id) {
    const [user] = await db("users")
      .where({ id })
      .update({
        email_verified: true,
        updated_at: db.fn.now(),
      })
      .returning("*");

    return user;
  }
}

module.exports = new UserRepository();