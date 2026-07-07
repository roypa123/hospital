const medicineRepository = require("../repositories/medicine.repository");
const { NotFoundError, ConflictError } = require("../shared/errors");

class MedicineService {
  async getMedicines(filters = {}) {
    return await medicineRepository.findAll(filters);
  }

  async getMedicineById(id) {
    const medicine = await medicineRepository.findById(id);
    if (!medicine) {
      throw new NotFoundError("Medicine not found in catalog");
    }
    return medicine;
  }

  async createMedicine(data) {
    const existing = await medicineRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError(`Medicine name '${data.name}' is already indexed in the catalog`);
    }

    return await medicineRepository.create({
      name: data.name,
      generic_name: data.generic_name,
      category: data.category,
      strength: data.strength,
      form: data.form,
      is_active: true,
    });
  }

  async updateMedicine(id, data) {
    await this.getMedicineById(id); // Check existence

    if (data.name) {
      const existing = await medicineRepository.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Medicine name '${data.name}' already exists in catalog`);
      }
    }

    return await medicineRepository.update(id, data);
  }

  async deleteMedicine(id) {
    await this.getMedicineById(id);
    return await medicineRepository.deactivate(id);
  }
}

module.exports = new MedicineService();
