exports.up = function (knex) {
  return knex.schema.createTable("user_sessions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table.string("device_name", 200);

    table.string("browser", 100);

    table.string("os", 100);

    table.string("ip_address", 50);

    table.string("user_agent", 500);

    table.boolean("is_active").defaultTo(true);

    table.timestamp("login_at").defaultTo(knex.fn.now());

    table.timestamp("logout_at");

    table.timestamp("last_activity").defaultTo(knex.fn.now());

    table.timestamps(true, true);

    table.index(["user_id"]);

    table.index(["is_active"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("user_sessions");
};
