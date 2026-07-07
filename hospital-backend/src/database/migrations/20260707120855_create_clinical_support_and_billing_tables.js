exports.up = function (knex) {
  return knex.schema
    .createTable("medicine_stock", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("medicine_id")
        .notNullable()
        .references("id")
        .inTable("medicines")
        .onDelete("CASCADE");
      table.string("batch_number", 100).notNullable();
      table.date("expiry_date").notNullable();
      table.integer("quantity").notNullable().defaultTo(0);
      table.decimal("cost_price", 10, 2).notNullable().defaultTo(0);
      table.decimal("selling_price", 10, 2).notNullable().defaultTo(0);
      table.timestamps(true, true);

      table.index(["medicine_id", "expiry_date"]);
    })
    .createTable("medicine_dispenses", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("prescription_id")
        .notNullable()
        .references("id")
        .inTable("prescriptions")
        .onDelete("CASCADE");
      table
        .uuid("pharmacist_user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("RESTRICT");
      table.timestamp("dispensed_at").defaultTo(knex.fn.now());
      table.timestamps(true, true);
    })
    .createTable("medicine_dispense_items", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("dispense_id")
        .notNullable()
        .references("id")
        .inTable("medicine_dispenses")
        .onDelete("CASCADE");
      table
        .uuid("prescription_item_id")
        .notNullable()
        .references("id")
        .inTable("prescription_items")
        .onDelete("CASCADE");
      table
        .uuid("medicine_id")
        .notNullable()
        .references("id")
        .inTable("medicines")
        .onDelete("RESTRICT");
      table.integer("quantity_dispensed").notNullable();
      table.timestamps(true, true);
    })
    .createTable("lab_tests", (table) => {
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
      table.string("test_name", 200).notNullable();
      table.string("category", 100).notNullable(); // 'Blood Test', 'Urine Test', 'X-Ray', 'MRI', etc.
      table.string("status", 50).notNullable().defaultTo("pending"); // 'pending', 'completed', 'approved'
      table
        .uuid("lab_technician_id")
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
      table.text("results_summary");
      table.text("findings");
      table
        .uuid("approved_by")
        .references("id")
        .inTable("doctors")
        .onDelete("SET NULL");
      table.timestamps(true, true);

      table.index(["patient_id"]);
      table.index(["status"]);
    })
    .createTable("bills", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("patient_id")
        .notNullable()
        .references("id")
        .inTable("patients")
        .onDelete("CASCADE");
      table
        .uuid("appointment_id")
        .references("id")
        .inTable("appointments")
        .onDelete("SET NULL");
      table.decimal("total_amount", 10, 2).notNullable().defaultTo(0);
      table.decimal("discount_amount", 10, 2).notNullable().defaultTo(0);
      table.decimal("tax_amount", 10, 2).notNullable().defaultTo(0);
      table.decimal("net_amount", 10, 2).notNullable().defaultTo(0);
      table.decimal("paid_amount", 10, 2).notNullable().defaultTo(0);
      table.string("status", 50).notNullable().defaultTo("unpaid"); // 'unpaid', 'partially_paid', 'paid', 'void'
      table.timestamps(true, true);

      table.index(["patient_id"]);
      table.index(["status"]);
    })
    .createTable("bill_items", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("bill_id")
        .notNullable()
        .references("id")
        .inTable("bills")
        .onDelete("CASCADE");
      table.string("item_name", 200).notNullable();
      table.string("item_type", 100).notNullable(); // 'consultation', 'lab_test', 'pharmacy', 'other'
      table.uuid("reference_id"); // E.g. lab_test_id, prescription_item_id, etc.
      table.integer("quantity").notNullable().defaultTo(1);
      table.decimal("unit_price", 10, 2).notNullable().defaultTo(0);
      table.decimal("total_price", 10, 2).notNullable().defaultTo(0);
      table.timestamps(true, true);

      table.index(["bill_id"]);
    })
    .createTable("payments", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("bill_id")
        .notNullable()
        .references("id")
        .inTable("bills")
        .onDelete("CASCADE");
      table.decimal("amount", 10, 2).notNullable();
      table.string("payment_method", 100).notNullable(); // 'cash', 'card', 'insurance', etc.
      table.string("transaction_reference", 200);
      table.timestamp("paid_at").defaultTo(knex.fn.now());
      table.timestamps(true, true);

      table.index(["bill_id"]);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("payments")
    .dropTableIfExists("bill_items")
    .dropTableIfExists("bills")
    .dropTableIfExists("lab_tests")
    .dropTableIfExists("medicine_dispense_items")
    .dropTableIfExists("medicine_dispenses")
    .dropTableIfExists("medicine_stock");
};
