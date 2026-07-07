const db = require("../config/knex");

class InsuranceRepository {
  async findProviderById(id) {
    return await db("insurance_providers").where({ id }).first();
  }

  async findProviderByName(name) {
    return await db("insurance_providers").where({ name }).first();
  }

  async getAllProviders() {
    return await db("insurance_providers").where({ is_active: true }).orderBy("name", "asc");
  }

  async createPolicy(data) {
    const [policy] = await db("patient_insurance_policies").insert(data).returning("*");
    return policy;
  }

  async findPolicyById(id) {
    return await db("patient_insurance_policies").where({ id }).first();
  }

  async findPoliciesByPatientId(patientId) {
    return await db("patient_insurance_policies")
      .join("insurance_providers", "patient_insurance_policies.insurance_provider_id", "insurance_providers.id")
      .where("patient_insurance_policies.patient_id", patientId)
      .select("patient_insurance_policies.*", "insurance_providers.name as provider_name")
      .orderBy("patient_insurance_policies.expiry_date", "desc");
  }

  async createClaim(data, trx) {
    const query = trx || db;
    const [claim] = await query("insurance_claims").insert(data).returning("*");
    return claim;
  }

  async updateClaim(id, data, trx) {
    const query = trx || db;
    const [claim] = await query("insurance_claims")
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning("*");
    return claim;
  }

  async findClaimById(id) {
    return await db("insurance_claims")
      .join("patient_insurance_policies", "insurance_claims.patient_insurance_policy_id", "patient_insurance_policies.id")
      .join("insurance_providers", "patient_insurance_policies.insurance_provider_id", "insurance_providers.id")
      .join("bills", "insurance_claims.bill_id", "bills.id")
      .where("insurance_claims.id", id)
      .select(
        "insurance_claims.*",
        "insurance_providers.name as provider_name",
        "patient_insurance_policies.policy_number",
        "bills.total_amount as bill_total_amount",
        "bills.net_amount as bill_net_amount"
      )
      .first();
  }

  async findClaimByClaimNumber(claimNumber) {
    return await db("insurance_claims").where({ claim_number: claimNumber }).first();
  }

  async findAllClaims(filters = {}) {
    const query = db("insurance_claims")
      .join("patient_insurance_policies", "insurance_claims.patient_insurance_policy_id", "patient_insurance_policies.id")
      .join("insurance_providers", "patient_insurance_policies.insurance_provider_id", "insurance_providers.id")
      .select(
        "insurance_claims.*",
        "insurance_providers.name as provider_name",
        "patient_insurance_policies.policy_number"
      );

    if (filters.status) {
      query.where("insurance_claims.status", filters.status);
    }
    if (filters.patient_id) {
      query.where("patient_insurance_policies.patient_id", filters.patient_id);
    }

    return await query.orderBy("insurance_claims.created_at", "desc");
  }
}

module.exports = new InsuranceRepository();
