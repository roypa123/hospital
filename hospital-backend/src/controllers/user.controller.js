const userService = require("../services/user.service");
const { sendSuccess } = require("../shared/response");

class UserController {
  async list(req, res, next) {
    try {
      const users = await userService.getAllUsers(req.query);
      return sendSuccess(res, "Users list retrieved successfully", users);
    } catch (error) {
      return next(error);
    }
  }

  async get(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      return sendSuccess(res, "User profile details retrieved", user);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      return sendSuccess(res, "User profile details updated successfully", user);
    } catch (error) {
      return next(error);
    }
  }

  async changeRole(req, res, next) {
    try {
      const { role } = req.body;
      const userRoles = await userService.updateUserRole(req.params.id, role);
      return sendSuccess(res, "User role modified successfully", userRoles);
    } catch (error) {
      return next(error);
    }
  }

  async changeStatus(req, res, next) {
    try {
      const { is_active } = req.body;
      const user = await userService.updateUserStatus(req.params.id, is_active);
      return sendSuccess(res, `User account ${user.is_active ? "activated" : "deactivated"} successfully`, user);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new UserController();
