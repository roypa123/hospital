const medicineService = require("../services/medicine.service");
const { sendSuccess } = require("../shared/response");

class MedicineController {
  async list(req, res, next) {
    try {
      const { category, search } = req.query;
      const list = await medicineService.getMedicines({ category, search });
      return sendSuccess(res, "Medicines catalog list retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async get(req, res, next) {
    try {
      const medicine = await medicineService.getMedicineById(req.params.id);
      return sendSuccess(res, "Medicine details retrieved", medicine);
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const medicine = await medicineService.createMedicine(req.body);
      return sendSuccess(res, "Medicine added to catalog successfully", medicine, 201);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const medicine = await medicineService.updateMedicine(req.params.id, req.body);
      return sendSuccess(res, "Medicine updated successfully", medicine);
    } catch (error) {
      return next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await medicineService.deleteMedicine(req.params.id);
      return sendSuccess(res, "Medicine deactivated from catalog successfully");
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new MedicineController();
