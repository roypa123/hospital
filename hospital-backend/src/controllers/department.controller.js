const departmentService = require("../services/department.service");
const { sendSuccess } = require("../shared/response");

class DepartmentController {
  async create(req, res, next) {
    try {
      const department = await departmentService.createDepartment(req.body);
      return sendSuccess(res, "Department created successfully", department, 201);
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const list = await departmentService.getDepartments(includeInactive);
      return sendSuccess(res, "Departments list retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async get(req, res, next) {
    try {
      const department = await departmentService.getDepartmentById(req.params.id);
      return sendSuccess(res, "Department details retrieved", department);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const department = await departmentService.updateDepartment(req.params.id, req.body);
      return sendSuccess(res, "Department updated successfully", department);
    } catch (error) {
      return next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await departmentService.deleteDepartment(req.params.id);
      return sendSuccess(res, "Department deactivated successfully");
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new DepartmentController();
