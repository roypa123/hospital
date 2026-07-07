const db = require("../config/knex");
const userRepository = require("../repositories/user.repository");
const { NotFoundError, BadRequestError } = require("../shared/errors");

class UserService {
  async getAllUsers(filters) {
    return await userRepository.findAll(filters);
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User account not found");
    }
    // Clean password
    delete user.password;
    return user;
  }

  async updateUser(id, data) {
    // Prevent updating email and password directly through this profile route
    const cleanData = { ...data };
    delete cleanData.email;
    delete cleanData.password;
    delete cleanData.is_active;
    delete cleanData.email_verified;

    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User account not found");
    }

    return await userRepository.update(id, cleanData);
  }

  async updateUserRole(userId, roleName) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User account not found");
    }

    const validRoles = ["ADMIN", "DOCTOR", "PATIENT", "PHARMACIST", "CASHIER", "RECEPTIONIST", "NURSE"];
    if (!validRoles.includes(roleName.toUpperCase())) {
      throw new BadRequestError(`Invalid role selection: '${roleName}'`);
    }

    return await db.transaction(async (trx) => {
      await userRepository.updateRole(userId, roleName.toUpperCase(), trx);
      return await userRepository.getUserRolesAndPermissions(userId);
    });
  }

  async updateUserStatus(userId, isActive) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User account not found");
    }

    const activeBool = isActive === "true" || isActive === true;
    return await userRepository.update(userId, { is_active: activeBool });
  }
}

module.exports = new UserService();
