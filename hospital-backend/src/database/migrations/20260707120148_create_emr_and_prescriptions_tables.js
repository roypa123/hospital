exports.up = function (knex) {
  return knex.schema
    .createTable("medical_records", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("patient_id")
        .notNullable()
        .references("id")
        .inTable("patients")
        .onDelete("CASCADE");
      table
        .uuid("doctor_id")
        .notNullable()
        .references("id")
        .inTable("doctors")
        .onDelete("CASCADE");
      table
        .uuid("appointment_id")
        .references("id")
        .inTable("appointments")
        .onDelete("SET NULL");
      table.text("symptoms");
      table.text("diagnosis");
      table.jsonb("vital_signs"); // bp, heart_rate, temp, respiratory_rate, weight, spo2
      table.text("clinical_notes");
      table.text("treatment_plan");
      table.timestamps(true, true);

      table.index(["patient_id"]);
      table.index(["doctor_id"]);
    })
    .createTable("medicines", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("name", 200).unique().notNullable();
      table.string("generic_name", 200);
      table.string("category", 100);
      table.string("strength", 50);
      table.string("form", 50); // capsule, tablet, injection, syrup
      table.boolean("is_active").defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable("prescriptions", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("patient_id")
        .notNullable()
        .references("id")
        .inTable("patients")
        .onDelete("CASCADE");
      table
        .uuid("doctor_id")
        .notNullable()
        .references("id")
        .inTable("doctors")
        .onDelete("CASCADE");
      table
        .uuid("medical_record_id")
        .references("id")
        .inTable("medical_records")
        .onDelete("CASCADE");
      table.text("notes");
      table.text("digital_signature");
      table.timestamps(true, true);

      table.index(["patient_id"]);
      table.index(["medical_record_id"]);
    })
    .createTable("prescription_items", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("prescription_id")
        .notNullable()
        .references("id")
        .inTable("prescriptions")
        .onDelete("CASCADE");
      table
        .uuid("medicine_id")
        .references("id")
        .inTable("medicines")
        .onDelete("SET NULL");
      table.string("medicine_name_custom", 200); // For custom, unindexed medicines
      table.boolean("dosage_morning").defaultTo(false);
      table.boolean("dosage_afternoon").defaultTo(false);
      table.boolean("dosage_night").defaultTo(false);
      table.string("instruction", 50).defaultTo("AFTER_FOOD"); // 'BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD'
      table.integer("duration_days").defaultTo(0);
      table.integer("quantity").defaultTo(0);
      table.integer("refill_count").defaultTo(0);
      table.text("additional_instructions");
      table.timestamps(true, true);

      table.index(["prescription_id"]);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("prescription_items")
    .dropTableIfExists("prescriptions")
    .dropTableIfExists("medicines")
    .dropTableIfExists("medical_records");
};
