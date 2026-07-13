const db = require("../config/knex");
const billingRepository = require("../repositories/billing.repository");
const { NotFoundError, BadRequestError } = require("../shared/errors");
const auditService = require("./audit.service");
const crypto = require("crypto");
const { razorpayInstance, keyId, keySecret, isMock } = require("../config/razorpay");

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
      const fetchedBill = await billingRepository.findById(bill.id);
      if (fetchedBill) {
        const taxAmt = parseFloat(fetchedBill.tax_amount || 0);
        fetchedBill.cgst_amount = parseFloat((taxAmt / 2).toFixed(2));
        fetchedBill.sgst_amount = parseFloat((taxAmt / 2).toFixed(2));
        fetchedBill.hospital_gstin = process.env.HOSPITAL_GSTIN || "29AAAAA1111A1Z1";
      }
      return fetchedBill;
    }
  }

  async getBills(filters = {}) {
    const bills = await billingRepository.findAll(filters);
    return bills.map((b) => {
      const taxAmt = parseFloat(b.tax_amount || 0);
      b.cgst_amount = parseFloat((taxAmt / 2).toFixed(2));
      b.sgst_amount = parseFloat((taxAmt / 2).toFixed(2));
      b.hospital_gstin = process.env.HOSPITAL_GSTIN || "29AAAAA1111A1Z1";
      return b;
    });
  }

  async getBillById(id) {
    const bill = await billingRepository.findById(id);
    if (!bill) {
      throw new NotFoundError("Bill not found");
    }
    const taxAmt = parseFloat(bill.tax_amount || 0);
    bill.cgst_amount = parseFloat((taxAmt / 2).toFixed(2));
    bill.sgst_amount = parseFloat((taxAmt / 2).toFixed(2));
    bill.hospital_gstin = process.env.HOSPITAL_GSTIN || "29AAAAA1111A1Z1";
    return bill;
  }

  /**
   * Registers a payment against an invoice and updates its paid status
   */
  async recordPayment(billId, paymentData, req = null) {
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

      // Log audit trail
      const actorUserId = req && req.user ? req.user.id : null;
      const ipAddress = req ? (req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress) : null;
      auditService.log(actorUserId, "INVOICE_PAYMENT", "bills", billId, { amount: amountToPay, status: newStatus }, ipAddress);
    });

    return await this.getBillById(billId);
  }

  async createRazorpayOrder(billId) {
    const bill = await billingRepository.findById(billId);
    if (!bill) {
      throw new NotFoundError("Bill not found");
    }

    const balance = parseFloat(bill.net_amount) - parseFloat(bill.paid_amount);
    if (balance <= 0) {
      throw new BadRequestError("This bill has already been fully paid.");
    }

    const amountInPaise = Math.round(balance * 100);

    if (isMock) {
      return {
        id: `order_mock_${Date.now()}`,
        entity: "order",
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: "INR",
        receipt: billId,
        status: "created",
        key_id: keyId
      };
    }

    try {
      const order = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: billId,
      });
      return {
        ...order,
        key_id: keyId
      };
    } catch (err) {
      throw new BadRequestError(`Razorpay order creation failed: ${err.message}`);
    }
  }

  async verifyRazorpayPayment(billId, paymentData, req = null) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new BadRequestError("Missing required Razorpay payment confirmation fields.");
    }

    // Verify signature
    if (!isMock) {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        throw new BadRequestError("Invalid payment signature verification failed");
      }
    } else {
      // In Mock Mode, verify that the mock signature contains the expected signature pattern
      const expectedMockSig = crypto
        .createHash("sha256")
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      
      if (razorpay_signature !== "mock_sig_pass" && razorpay_signature !== expectedMockSig) {
        throw new BadRequestError("Mock payment signature verification failed");
      }
    }

    const bill = await billingRepository.findById(billId);
    if (!bill) {
      throw new NotFoundError("Bill not found");
    }

    const balance = parseFloat(bill.net_amount) - parseFloat(bill.paid_amount);

    return await this.recordPayment(
      billId,
      {
        amount: balance,
        payment_method: "razorpay",
        transaction_reference: razorpay_payment_id,
      },
      req
    );
  }
}

module.exports = new BillingService();
