const departmentRepository = require("../repositories/department.repository");
const { ConflictError, NotFoundError } = require("../shared/errors");

class DepartmentService {
  async createDepartment(data) {
    const code = data.code.toUpperCase();
    
    const existingCode = await departmentRepository.findByCode(code);
    if (existingCode) {
      throw new ConflictError(`Department code '${code}' already exists`);
    }

    return await departmentRepository.create({
      name: data.name,
      description: data.description,
      code,
      is_active: true,
    });
  }

  async getDepartments(includeInactive = false) {
    return await departmentRepository.findAll(includeInactive);
  }

  async getDepartmentById(id) {
    const department = await departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundError("Department not found");
    }
    return department;
  }

  async updateDepartment(id, data) {
    await this.getDepartmentById(id); // Check existence

    if (data.code) {
      const code = data.code.toUpperCase();
      const existing = await departmentRepository.findByCode(code);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Department code '${code}' is already assigned to another department`);
      }
      data.code = code;
    }

    return await departmentRepository.update(id, data);
  }

  async deleteDepartment(id) {
    await this.getDepartmentById(id);
    return await departmentRepository.deactivate(id);
  }
}

module.exports = new DepartmentService();
