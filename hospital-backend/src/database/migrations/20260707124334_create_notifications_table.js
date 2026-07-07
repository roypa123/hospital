exports.up = function (knex) {
  return knex.schema.createTable("notifications", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("title", 255).notNullable();
    table.text("message").notNullable();
    table.boolean("is_read").defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index(["user_id"]);
    table.index(["is_read"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("notifications");
};
