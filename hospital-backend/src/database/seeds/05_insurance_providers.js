exports.seed = async function (knex) {
  // Truncate tables in dependency order
  await knex("insurance_claims").del();
  await knex("patient_insurance_policies").del();
  await knex("insurance_providers").del();

  // Seed default insurance providers
  await knex("insurance_providers").insert([
    {
      name: "CareFirst BlueCross BlueShield",
      contact_email: "claims@carefirst.com",
      contact_phone: "+1-800-555-0199",
      is_active: true,
    },
    {
      name: "Aetna Health Coverage",
      contact_email: "support@aetna.com",
      contact_phone: "+1-800-555-0188",
      is_active: true,
    },
    {
      name: "Cigna Health Inpatient",
      contact_email: "info@cigna.com",
      contact_phone: "+1-800-555-0177",
      is_active: true,
    },
  ]);
};
