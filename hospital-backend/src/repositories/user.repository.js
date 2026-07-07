const db = require("../config/knex");

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
        password: passwordHash,
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

  async getUserRolesAndPermissions(userId) {
    const roles = await db("roles")
      .join("user_roles", "roles.id", "user_roles.role_id")
      .where("user_roles.user_id", userId)
      .select("roles.name");

    const roleNames = roles.map(r => r.name);

    const permissions = await db("permissions")
      .join("role_permissions", "permissions.id", "role_permissions.permission_id")
      .join("user_roles", "role_permissions.role_id", "user_roles.role_id")
      .where("user_roles.user_id", userId)
      .select("permissions.name");

    const permissionNames = [...new Set(permissions.map(p => p.name))];

    return { roles: roleNames, permissions: permissionNames };
  }
}

module.exports = new UserRepository();