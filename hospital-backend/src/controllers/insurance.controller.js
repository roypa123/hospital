const insuranceService = require("../services/insurance.service");
const patientRepository = require("../repositories/patient.repository");
const { sendSuccess } = require("../shared/response");
const { ForbiddenError } = require("../shared/errors");

class InsuranceController {
  async getProviders(req, res, next) {
    try {
      const providers = await insuranceService.getProviders();
      return sendSuccess(res, "Insurance providers retrieved", providers);
    } catch (error) {
      return next(error);
    }
  }

  async registerPolicy(req, res, next) {
    try {
      const policy = await insuranceService.registerPolicy(req.user.id, req.body);
      return sendSuccess(res, "Insurance policy registered successfully", policy, 201);
    } catch (error) {
      return next(error);
    }
  }

  async getPolicies(req, res, next) {
    try {
      let { patientId } = req.query;
      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "CASHIER"].includes(r)
      );

      // ABAC: If patient, force lookup of their own policies
      if (!isStaff && req.user.roles.includes("PATIENT")) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient) {
          return sendSuccess(res, "Insurance policies list", []);
        }
        patientId = patient.id;
      }

      if (!patientId) {
        return sendSuccess(res, "Insurance policies list", []);
      }

      const list = await insuranceService.getPatientPolicies(patientId);
      return sendSuccess(res, "Insurance policies retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async submitClaim(req, res, next) {
    try {
      const claim = await insuranceService.submitClaim(req.body);
      return sendSuccess(res, "Insurance claim submitted successfully", claim, 201);
    } catch (error) {
      return next(error);
    }
  }

  async decideClaim(req, res, next) {
    try {
      const { id } = req.params;
      const claim = await insuranceService.decideClaim(id, req.body, req);
      return sendSuccess(res, "Claim decision processed successfully", claim);
    } catch (error) {
      return next(error);
    }
  }

  async listClaims(req, res, next) {
    try {
      const filters = {};
      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "CASHIER"].includes(r)
      );

      // ABAC: Patients see only their own claims
      if (!isStaff && req.user.roles.includes("PATIENT")) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient) {
          return sendSuccess(res, "Insurance claims list", []);
        }
        filters.patient_id = patient.id;
      } else {
        if (req.query.patient_id) filters.patient_id = req.query.patient_id;
        if (req.query.status) filters.status = req.query.status;
      }

      const list = await insuranceService.getClaimsList(filters);
      return sendSuccess(res, "Insurance claims list retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async getClaim(req, res, next) {
    try {
      const claim = await insuranceService.getClaimDetails(req.params.id);
      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "CASHIER"].includes(r)
      );

      // ABAC check
      if (!isStaff) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient || patient.id !== claim.patient_id) {
          throw new ForbiddenError("Forbidden: You cannot view another patient's insurance claim details");
        }
      }

      return sendSuccess(res, "Insurance claim details retrieved", claim);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new InsuranceController();
