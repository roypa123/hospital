exports.up = function (knex) {
  return knex.schema
    .createTable("insurance_providers", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("name", 200).notNullable().unique();
      table.string("contact_email", 200).notNullable();
      table.string("contact_phone", 50);
      table.boolean("is_active").notNullable().defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable("patient_insurance_policies", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("patient_id")
        .notNullable()
        .references("id")
        .inTable("patients")
        .onDelete("CASCADE");
      table
        .uuid("insurance_provider_id")
        .notNullable()
        .references("id")
        .inTable("insurance_providers")
        .onDelete("RESTRICT");
      table.string("policy_number", 100).notNullable();
      table.jsonb("coverage_details");
      table.date("expiry_date").notNullable();
      table.timestamps(true, true);

      table.index(["patient_id"]);
      table.unique(["insurance_provider_id", "policy_number"]);
    })
    .createTable("insurance_claims", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("bill_id")
        .notNullable()
        .references("id")
        .inTable("bills")
        .onDelete("CASCADE");
      table
        .uuid("patient_insurance_policy_id")
        .notNullable()
        .references("id")
        .inTable("patient_insurance_policies")
        .onDelete("RESTRICT");
      table.string("claim_number", 100).notNullable().unique();
      table.string("status", 50).notNullable().defaultTo("submitted"); // 'submitted', 'processing', 'approved', 'rejected'
      table.decimal("claim_amount", 10, 2).notNullable();
      table.decimal("approved_amount", 10, 2).notNullable().defaultTo(0);
      table.text("rejection_reason");
      table.timestamps(true, true);

      table.index(["bill_id"]);
      table.index(["status"]);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("insurance_claims")
    .dropTableIfExists("patient_insurance_policies")
    .dropTableIfExists("insurance_providers");
};
