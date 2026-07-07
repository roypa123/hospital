const pharmacyService = require("../services/pharmacy.service");
const { sendSuccess } = require("../shared/response");

class PharmacyController {
  async addStock(req, res, next) {
    try {
      const { medicineId } = req.params;
      const stock = await pharmacyService.addInventory(medicineId, req.body);
      return sendSuccess(res, "Stock added successfully", stock, 201);
    } catch (error) {
      return next(error);
    }
  }

  async getStockLevel(req, res, next) {
    try {
      const { medicineId } = req.params;
      const stockList = await pharmacyService.getStock(medicineId);
      return sendSuccess(res, "Stock levels retrieved", stockList);
    } catch (error) {
      return next(error);
    }
  }

  async dispense(req, res, next) {
    try {
      const { prescriptionId } = req.body;
      const dispense = await pharmacyService.dispensePrescription(prescriptionId, req.user.id);
      return sendSuccess(res, "Prescription medicines dispensed successfully", dispense, 201);
    } catch (error) {
      return next(error);
    }
  }

  async listDispenses(req, res, next) {
    try {
      const list = await pharmacyService.getDispensesList(req.query);
      return sendSuccess(res, "Dispenses listing retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async getDispense(req, res, next) {
    try {
      const details = await pharmacyService.getDispenseDetails(req.params.id);
      return sendSuccess(res, "Dispense details retrieved", details);
    } catch (error) {
      return next(error);
    }
  }

  async getAllStock(req, res, next) {
    try {
      const stock = await pharmacyService.getAllInventory(req.query);
      return sendSuccess(res, "All pharmacy stock levels retrieved", stock);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PharmacyController();
