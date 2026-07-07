const billingService = require("../services/billing.service");
const checkoutService = require("../services/checkout.service");
const patientRepository = require("../repositories/patient.repository");
const { sendSuccess } = require("../shared/response");
const { ForbiddenError } = require("../shared/errors");

class BillingController {
  async checkout(req, res, next) {
    try {
      const { appointmentId } = req.params;
      const checkoutResult = await checkoutService.checkout(appointmentId, req.user.id, req.body, req);
      return sendSuccess(res, "Unified consultation checkout transaction completed successfully", checkoutResult, 201);
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { patient_id, appointment_id, items, discount_rate, tax_rate } = req.body;
      const bill = await billingService.createBill(patient_id, appointment_id, items, discount_rate, tax_rate);
      return sendSuccess(res, "Bill invoice generated successfully", bill, 201);
    } catch (error) {
      return next(error);
    }
  }

  async pay(req, res, next) {
    try {
      const { id } = req.params;
      const updatedBill = await billingService.recordPayment(id, req.body, req);
      return sendSuccess(res, "Payment processed and recorded successfully", updatedBill);
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const filters = {};
      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "CASHIER"].includes(r)
      );

      // ABAC: Patients see only their own invoices
      if (!isStaff && req.user.roles.includes("PATIENT")) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient) {
          return sendSuccess(res, "Bills list", []);
        }
        filters.patient_id = patient.id;
      } else {
        if (req.query.patient_id) filters.patient_id = req.query.patient_id;
        if (req.query.status) filters.status = req.query.status;
      }

      const list = await billingService.getBills(filters);
      return sendSuccess(res, "Bills invoice list retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async get(req, res, next) {
    try {
      const bill = await billingService.getBillById(req.params.id);

      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "CASHIER"].includes(r)
      );

      // Verify access permission
      if (!isStaff) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient || patient.id !== bill.patient_id) {
          throw new ForbiddenError("Forbidden: You cannot view another patient's billing invoice");
        }
      }

      return sendSuccess(res, "Billing details retrieved", bill);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new BillingController();
