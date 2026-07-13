const db = require("../config/knex");
const pharmacyRepository = require("../repositories/pharmacy.repository");
const prescriptionRepository = require("../repositories/prescription.repository");
const { NotFoundError, BadRequestError, ConflictError } = require("../shared/errors");

class PharmacyService {
  async addInventory(medicineId, data) {
    return await pharmacyRepository.createStock({
      medicine_id: medicineId,
      batch_number: data.batch_number,
      expiry_date: data.expiry_date,
      quantity: parseInt(data.quantity, 10),
      cost_price: parseFloat(data.cost_price),
      selling_price: parseFloat(data.selling_price),
    });
  }

  async getStock(medicineId) {
    return await pharmacyRepository.findStockByMedicineId(medicineId);
  }

  /**
   * Dispenses a prescription, deducting stock matching FEFO (First Expiry First Out) rules.
   */
  async dispensePrescription(prescriptionId, pharmacistUserId) {
    const prescription = await prescriptionRepository.findById(prescriptionId);
    if (!prescription) {
      throw new NotFoundError("Prescription not found");
    }

    // Check if already dispensed
    const existingDispenses = await pharmacyRepository.getDispenses({ prescription_id: prescriptionId });
    if (existingDispenses.length > 0) {
      throw new ConflictError("This prescription has already been dispensed.");
    }

    return await db.transaction(async (trx) => {
      // 1. Create dispense header
      const dispense = await pharmacyRepository.createDispense({
        prescription_id: prescriptionId,
        pharmacist_user_id: pharmacistUserId,
      }, trx);

      const dispenseItems = [];

      // 2. Iterate through items and deduct stock
      for (const item of prescription.items) {
        if (!item.medicine_id) {
          // Custom/unindexed medicines cannot be deducted from stock, skip inventory check but log it
          dispenseItems.push({
            dispense_id: dispense.id,
            prescription_item_id: item.id,
            medicine_id: item.medicine_id || "00000000-0000-0000-0000-000000000000", // Placeholder if unindexed
            quantity_dispensed: item.quantity,
          });
          continue;
        }

        // Lock stock batches for this medicine
        const stockBatches = await pharmacyRepository.findStockByMedicineIdWithLock(item.medicine_id, trx);
        const totalAvailable = stockBatches.reduce((acc, curr) => acc + curr.quantity, 0);

        if (totalAvailable < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for medicine '${item.medicine_name}'. Requested: ${item.quantity}, Available in stock: ${totalAvailable}`
          );
        }

        let remainingToDeduct = item.quantity;

        // Apply FEFO stock deduction
        for (const batch of stockBatches) {
          if (remainingToDeduct <= 0) break;

          if (batch.quantity >= remainingToDeduct) {
            // Batch has enough quantity to satisfy remaining demand
            await pharmacyRepository.updateStockQuantity(batch.id, batch.quantity - remainingToDeduct, trx);
            remainingToDeduct = 0;
          } else {
            // Batch is partially depleted
            remainingToDeduct -= batch.quantity;
            await pharmacyRepository.updateStockQuantity(batch.id, 0, trx);
          }
        }

        dispenseItems.push({
          dispense_id: dispense.id,
          prescription_item_id: item.id,
          medicine_id: item.medicine_id,
          quantity_dispensed: item.quantity,
        });
      }

      // Bulk write dispense items log
      if (dispenseItems.length > 0) {
        // Filter out placeholder unindexed items before writing to DB foreign keys constraint, or log them with custom handler
        const dbItems = dispenseItems.filter(di => di.medicine_id !== "00000000-0000-0000-0000-000000000000");
        if (dbItems.length > 0) {
          await pharmacyRepository.createDispenseItemsBulk(dbItems, trx);
        }
      }

      return dispense;
    });
  }

  async getDispensesList(filters = {}) {
    return await pharmacyRepository.getDispenses(filters);
  }

  async getDispenseDetails(id) {
    const details = await pharmacyRepository.findDispenseById(id);
    if (!details) {
      throw new NotFoundError("Dispense record not found");
    }
    return details;
  }

  async getAllInventory(filters = {}) {
    return await pharmacyRepository.getAllStock(filters);
  }

  async adjustStock(medicineId, quantityChange) {
    return await db.transaction(async (trx) => {
      // Find latest/active stock batch for this medicine
      const batch = await trx("medicine_stock")
        .where({ medicine_id: medicineId })
        .orderBy("created_at", "desc")
        .first();

      if (quantityChange > 0) {
        // Adding stock
        if (batch) {
          const newQty = batch.quantity + quantityChange;
          await trx("medicine_stock")
            .where({ id: batch.id })
            .update({ quantity: newQty, updated_at: db.fn.now() });
        } else {
          // Create default batch
          await trx("medicine_stock").insert({
            medicine_id: medicineId,
            batch_number: "ADJUST-DEFAULT",
            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            quantity: quantityChange,
            cost_price: 0,
            selling_price: 0
          });
        }
      } else {
        // Subtracting stock
        if (!batch) {
          throw new BadRequestError("Cannot decrease stock: No stock batch exists for this medicine");
        }

        // Fetch all batches to deduct stock FEFO
        const batches = await trx("medicine_stock")
          .where({ medicine_id: medicineId })
          .orderBy("expiry_date", "asc")
          .forUpdate();

        const totalAvailable = batches.reduce((acc, curr) => acc + curr.quantity, 0);
        if (totalAvailable < Math.abs(quantityChange)) {
          throw new BadRequestError(`Insufficient stock. Available: ${totalAvailable}, Requested reduction: ${Math.abs(quantityChange)}`);
        }

        let remainingToDeduct = Math.abs(quantityChange);
        for (const b of batches) {
          if (remainingToDeduct <= 0) break;
          if (b.quantity >= remainingToDeduct) {
            await trx("medicine_stock")
              .where({ id: b.id })
              .update({ quantity: b.quantity - remainingToDeduct, updated_at: db.fn.now() });
            remainingToDeduct = 0;
          } else {
            remainingToDeduct -= b.quantity;
            await trx("medicine_stock")
              .where({ id: b.id })
              .update({ quantity: 0, updated_at: db.fn.now() });
          }
        }
      }

      return { success: true };
    });
  }
}

module.exports = new PharmacyService();
