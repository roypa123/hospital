const db = require("../config/knex");
const insuranceRepository = require("../repositories/insurance.repository");
const patientRepository = require("../repositories/patient.repository");
const billingRepository = require("../repositories/billing.repository");
const { NotFoundError, BadRequestError, ConflictError } = require("../shared/errors");

class InsuranceService {
  async getProviders() {
    return await insuranceRepository.getAllProviders();
  }

  async registerPolicy(patientUserId, data) {
    let patientId = data.patient_id;

    if (!patientId) {
      const patient = await patientRepository.findByUserId(patientUserId);
      if (!patient) {
        throw new NotFoundError("Patient profile not found for authenticated user");
      }
      patientId = patient.id;
    } else {
      // Validate that patient exists
      const patient = await patientRepository.findById(patientId);
      if (!patient) {
        throw new NotFoundError("Patient profile not found");
      }
    }

    const provider = await insuranceRepository.findProviderById(data.insurance_provider_id);
    if (!provider || !provider.is_active) {
      throw new NotFoundError("Active insurance provider not found");
    }

    return await insuranceRepository.createPolicy({
      patient_id: patientId,
      insurance_provider_id: data.insurance_provider_id,
      policy_number: data.policy_number,
      coverage_details: data.coverage_details || {},
      expiry_date: data.expiry_date,
    });
  }

  async getPatientPolicies(patientId) {
    return await insuranceRepository.findPoliciesByPatientId(patientId);
  }

  /**
   * Submits an insurance claim for a bill
   */
  async submitClaim(data) {
    const { bill_id, patient_insurance_policy_id, claim_amount } = data;

    const bill = await billingRepository.findById(bill_id);
    if (!bill) {
      throw new NotFoundError("Billing invoice not found");
    }

    const policy = await insuranceRepository.findPolicyById(patient_insurance_policy_id);
    if (!policy) {
      throw new NotFoundError("Patient insurance policy not found");
    }

    // Expiry check
    if (new Date(policy.expiry_date) < new Date()) {
      throw new BadRequestError("This insurance policy has expired.");
    }

    // Check if a claim is already active for this bill
    const existingClaims = await insuranceRepository.findAllClaims({ patient_id: policy.patient_id });
    const duplicate = existingClaims.find((c) => c.bill_id === bill_id && ["submitted", "processing", "approved"].includes(c.status));
    if (duplicate) {
      throw new ConflictError(`An active insurance claim (${duplicate.claim_number}) already exists for this bill.`);
    }

    const claimNumber = `CLM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return await insuranceRepository.createClaim({
      bill_id,
      patient_insurance_policy_id,
      claim_number: claimNumber,
      status: "submitted",
      claim_amount: parseFloat(claim_amount || bill.net_amount),
    });
  }

  /**
   * Processes a claims decision (approves or rejects).
   * Approving a claim credits the approved amount directly to the invoice in a transaction.
   */
  async decideClaim(claimId, decisionData) {
    const { status, approved_amount, rejection_reason } = decisionData;

    if (!["approved", "rejected"].includes(status)) {
      throw new BadRequestError("Claim decision status must be 'approved' or 'rejected'");
    }

    return await db.transaction(async (trx) => {
      const claim = await insuranceRepository.findClaimById(claimId);
      if (!claim) {
        throw new NotFoundError("Insurance claim not found");
      }

      if (claim.status === "approved" || claim.status === "rejected") {
        throw new BadRequestError(`This claim has already been resolved with status '${claim.status}'`);
      }

      if (status === "approved") {
        const approvedVal = parseFloat(approved_amount);
        if (isNaN(approvedVal) || approvedVal <= 0) {
          throw new BadRequestError("Approved amount is required and must be greater than zero for approved claims.");
        }
        if (approvedVal > parseFloat(claim.claim_amount)) {
          throw new BadRequestError(`Approved amount ($${approvedVal}) cannot exceed claim amount ($${claim.claim_amount}).`);
        }

        // 1. Update Claim record status
        await insuranceRepository.updateClaim(claimId, {
          status: "approved",
          approved_amount: approvedVal,
        }, trx);

        // 2. Fetch linked bill and record insurance payout credit
        const bill = await billingRepository.findById(claim.bill_id);
        if (!bill) {
          throw new NotFoundError("Linked bill not found");
        }

        await billingRepository.createPayment({
          bill_id: bill.id,
          amount: approvedVal,
          payment_method: "insurance",
          transaction_reference: claim.claim_number,
        }, trx);

        // 3. Update Bill status
        const newPaidAmount = parseFloat(bill.paid_amount) + approvedVal;
        let newStatus = "partially_paid";
        if (newPaidAmount + 0.01 >= parseFloat(bill.net_amount)) {
          newStatus = "paid";
        }

        await billingRepository.updateBill(bill.id, {
          paid_amount: newPaidAmount,
          status: newStatus,
        }, trx);

      } else {
        // Rejected Claim
        if (!rejection_reason || rejection_reason.trim() === "") {
          throw new BadRequestError("A rejection reason is required for rejected claims.");
        }

        await insuranceRepository.updateClaim(claimId, {
          status: "rejected",
          rejection_reason: rejection_reason.trim(),
        }, trx);
      }

      return await insuranceRepository.findClaimById(claimId);
    });
  }

  async getClaimsList(filters = {}) {
    return await insuranceRepository.findAllClaims(filters);
  }

  async getClaimDetails(id) {
    const claim = await insuranceRepository.findClaimById(id);
    if (!claim) {
      throw new NotFoundError("Insurance claim not found");
    }
    return claim;
  }
}

module.exports = new InsuranceService();
