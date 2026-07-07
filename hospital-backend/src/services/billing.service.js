const db = require("../config/knex");
const billingRepository = require("../repositories/billing.repository");
const { NotFoundError, BadRequestError } = require("../shared/errors");

class BillingService {
  /**
   * Generates a patient bill with invoice items, applying discount and tax rates
   */
  async createBill(patientId, appointmentId, items = [], discountRate = 0, taxRate = 0.05, trx) {
    if (!items || items.length === 0) {
      throw new BadRequestError("A bill must contain at least one charge item.");
    }

    const total = items.reduce((acc, curr) => acc + (parseFloat(curr.unit_price) * parseInt(curr.quantity || 1, 10)), 0);
    const discountAmount = total * discountRate;
    const taxAmount = (total - discountAmount) * taxRate;
    const netAmount = total - discountAmount + taxAmount;

    const executeBlock = async (connection) => {
      // 1. Create bill header
      const bill = await billingRepository.create(
        {
          patient_id: patientId,
          appointment_id: appointmentId || null,
          total_amount: total,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          net_amount: netAmount,
          paid_amount: 0,
          status: "unpaid",
        },
        connection
      );

      // 2. Map and insert bill items
      const billItems = items.map((i) => ({
        bill_id: bill.id,
        item_name: i.item_name,
        item_type: i.item_type || "other",
        reference_id: i.reference_id || null,
        quantity: parseInt(i.quantity || 1, 10),
        unit_price: parseFloat(i.unit_price),
        total_price: parseFloat(i.unit_price) * parseInt(i.quantity || 1, 10),
      }));

      await billingRepository.createItemsBulk(billItems, connection);
      return bill;
    };

    if (trx) {
      const bill = await executeBlock(trx);
      return bill;
    } else {
      const bill = await db.transaction(async (t) => await executeBlock(t));
      return await billingRepository.findById(bill.id);
    }
  }

  async getBills(filters = {}) {
    return await billingRepository.findAll(filters);
  }

  async getBillById(id) {
    const bill = await billingRepository.findById(id);
    if (!bill) {
      throw new NotFoundError("Bill not found");
    }
    return bill;
  }

  /**
   * Registers a payment against an invoice and updates its paid status
   */
  async recordPayment(billId, paymentData) {
    await db.transaction(async (trx) => {
      const bill = await billingRepository.findById(billId);
      if (!bill) {
        throw new NotFoundError("Bill not found");
      }

      if (bill.status === "paid") {
        throw new BadRequestError("This bill has already been fully paid.");
      }

      const amountToPay = parseFloat(paymentData.amount);
      if (amountToPay <= 0) {
        throw new BadRequestError("Payment amount must be greater than zero.");
      }

      // Create payment log
      await billingRepository.createPayment({
        bill_id: billId,
        amount: amountToPay,
        payment_method: paymentData.payment_method || "cash",
        transaction_reference: paymentData.transaction_reference || `TXN-${Date.now()}`,
      }, trx);

      // Recalculate billing sums
      const newPaidAmount = parseFloat(bill.paid_amount) + amountToPay;
      let newStatus = "partially_paid";
      
      // Allow minor floating point variances
      if (newPaidAmount + 0.01 >= parseFloat(bill.net_amount)) {
        newStatus = "paid";
      }

      await billingRepository.updateBill(billId, {
        paid_amount: newPaidAmount,
        status: newStatus,
      }, trx);
    });

    return await this.getBillById(billId);
  }
}

module.exports = new BillingService();
