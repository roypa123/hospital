exports.up = function (knex) {
  return knex.schema.createTable("audit_logs", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("action", 100).notNullable();
    table.string("resource_type", 100).notNullable();
    table.uuid("resource_id");
    table.jsonb("payload");
    table.string("ip_address", 50);
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index(["action"]);
    table.index(["user_id"]);
    table.index(["created_at"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("audit_logs");
};
