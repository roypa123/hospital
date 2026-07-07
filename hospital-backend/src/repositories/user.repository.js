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
      .select("roles.name", "roles.priority");

    const roleNames = roles.map(r => r.name);
    const rolePriorities = roles.reduce((acc, r) => ({ ...acc, [r.name]: r.priority }), {});

    const permissions = await db("permissions")
      .join("role_permissions", "permissions.id", "role_permissions.permission_id")
      .join("user_roles", "role_permissions.role_id", "user_roles.role_id")
      .where("user_roles.user_id", userId)
      .select("permissions.name");

    const permissionNames = [...new Set(permissions.map(p => p.name))];

    return { roles: roleNames, rolePriorities, permissions: permissionNames };
  }

  async findAll(filters = {}) {
    const query = db("users")
      .select("users.id", "users.email", "users.first_name", "users.last_name", "users.is_active", "users.email_verified", "users.created_at")
      .distinct();

    if (filters.role) {
      query
        .join("user_roles", "users.id", "user_roles.user_id")
        .join("roles", "user_roles.role_id", "roles.id")
        .where("roles.name", filters.role.toUpperCase());
    }

    if (filters.is_active !== undefined && filters.is_active !== "") {
      const activeBool = filters.is_active === "true" || filters.is_active === true;
      query.where("users.is_active", activeBool);
    }

    if (filters.search) {
      const searchLike = `%${filters.search.toLowerCase()}%`;
      query.andWhere((qb) => {
        qb.where(db.raw("LOWER(users.email)"), "like", searchLike)
          .orWhere(db.raw("LOWER(users.first_name)"), "like", searchLike)
          .orWhere(db.raw("LOWER(users.last_name)"), "like", searchLike);
      });
    }

    return await query.orderBy("users.created_at", "desc");
  }

  async update(id, data) {
    const [updated] = await db("users")
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      })
      .returning(["id", "email", "first_name", "last_name", "is_active", "email_verified"]);
    return updated;
  }

  async updateRole(userId, newRoleName, trx) {
    const query = trx || db;
    const role = await query("roles").where({ name: newRoleName.toUpperCase() }).first();
    if (!role) {
      throw new Error(`Role '${newRoleName}' not found`);
    }

    // 1. Delete existing roles
    await query("user_roles").where({ user_id: userId }).del();

    // 2. Insert new role
    const [userRole] = await query("user_roles")
      .insert({ user_id: userId, role_id: role.id })
      .returning("*");

    return userRole;
  }
}

module.exports = new UserRepository();