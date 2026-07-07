exports.up = function (knex) {
  return knex.schema
    .createTable("departments", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("name", 100).unique().notNullable();
      table.string("description", 500);
      table.string("code", 20).unique().notNullable();
      table.boolean("is_active").defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable("doctors", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("user_id")
        .unique()
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table
        .uuid("department_id")
        .references("id")
        .inTable("departments")
        .onDelete("SET NULL");
      table.string("specialization", 100);
      table.string("qualification", 200);
      table.decimal("consultation_fee", 10, 2).notNullable().defaultTo(0);
      table.string("room_number", 20);
      table.integer("experience_years").defaultTo(0);
      table.string("license_number", 100).unique().notNullable();
      table.boolean("is_active").defaultTo(true);
      table.timestamps(true, true);
      table.index(["department_id"]);
    })
    .createTable("patients", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("user_id")
        .unique()
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.date("date_of_birth");
      table.string("gender", 20);
      table.string("blood_group", 10);
      table.jsonb("allergies").defaultTo("[]");
      table.jsonb("emergency_contact");
      table.jsonb("insurance_details");
      table.boolean("is_active").defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable("password_resets", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("email", 255).notNullable();
      table.string("token", 255).notNullable();
      table.timestamp("expires_at").notNullable();
      table.boolean("used").defaultTo(false);
      table.timestamps(true, true);
      table.index(["token"]);
      table.index(["email"]);
    })
    .createTable("email_verifications", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.string("token", 255).notNullable();
      table.timestamp("expires_at").notNullable();
      table.boolean("used").defaultTo(false);
      table.timestamps(true, true);
      table.index(["token"]);
    })
    .createTable("two_factor_auth", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("user_id")
        .unique()
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.string("secret", 255).notNullable();
      table.boolean("enabled").defaultTo(false);
      table.jsonb("backup_codes").defaultTo("[]");
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("two_factor_auth")
    .dropTableIfExists("email_verifications")
    .dropTableIfExists("password_resets")
    .dropTableIfExists("patients")
    .dropTableIfExists("doctors")
    .dropTableIfExists("departments");
};
