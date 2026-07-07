exports.up = function (knex) {
  return knex.schema
    .createTable("doctor_schedules", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("doctor_id")
        .notNullable()
        .references("id")
        .inTable("doctors")
        .onDelete("CASCADE");
      table.integer("day_of_week").notNullable(); // 0 = Sunday, 1 = Monday, etc.
      table.time("start_time").notNullable();
      table.time("end_time").notNullable();
      table.integer("slot_duration").notNullable().defaultTo(30); // in minutes
      table.boolean("is_active").defaultTo(true);
      table.timestamps(true, true);

      table.index(["doctor_id"]);
    })
    .createTable("appointment_slots", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("doctor_id")
        .notNullable()
        .references("id")
        .inTable("doctors")
        .onDelete("CASCADE");
      table.date("date").notNullable();
      table.time("start_time").notNullable();
      table.time("end_time").notNullable();
      table.string("status", 50).notNullable().defaultTo("available"); // 'available', 'reserved', 'booked'
      table.integer("version").notNullable().defaultTo(1); // For Optimistic Locking
      table.timestamps(true, true);

      table.unique(["doctor_id", "date", "start_time"]);
      table.index(["doctor_id", "date", "status"]);
    })
    .createTable("appointments", (table) => {
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
        .uuid("slot_id")
        .notNullable()
        .references("id")
        .inTable("appointment_slots")
        .onDelete("CASCADE");
      table.date("appointment_date").notNullable();
      table.string("status", 50).notNullable().defaultTo("scheduled"); // 'scheduled', 'checked_in', 'consultation', 'completed', 'cancelled'
      table.string("visit_type", 100).notNullable().defaultTo("consultation"); // 'consultation', 'follow_up', 'walk_in'
      table.text("reason_for_visit");
      table.text("notes");
      table.timestamps(true, true);

      table.index(["patient_id"]);
      table.index(["doctor_id", "appointment_date"]);
      table.index(["slot_id"]);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("appointments")
    .dropTableIfExists("appointment_slots")
    .dropTableIfExists("doctor_schedules");
};
