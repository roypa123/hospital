exports.up = function (knex) {
  return knex.schema.createTable("refresh_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table.text("token").notNullable();

    table.timestamp("expires_at").notNullable();

    table.boolean("revoked").defaultTo(false);

    table.timestamps(true, true);

    table.index(["user_id"]);

    table.index(["token"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("refresh_tokens");
};