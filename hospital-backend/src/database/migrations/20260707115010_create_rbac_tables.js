exports.up = function (knex) {
  return knex.schema
    .createTable("roles", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("name", 100).unique().notNullable();
      table.string("description", 255);
      table.timestamps(true, true);
    })
    .createTable("permissions", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("name", 100).unique().notNullable();
      table.string("description", 255);
      table.timestamps(true, true);
    })
    .createTable("role_permissions", (table) => {
      table
        .uuid("role_id")
        .notNullable()
        .references("id")
        .inTable("roles")
        .onDelete("CASCADE");
      table
        .uuid("permission_id")
        .notNullable()
        .references("id")
        .inTable("permissions")
        .onDelete("CASCADE");
      table.primary(["role_id", "permission_id"]);
      table.index(["role_id"]);
      table.index(["permission_id"]);
    })
    .createTable("user_roles", (table) => {
      table
        .uuid("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table
        .uuid("role_id")
        .notNullable()
        .references("id")
        .inTable("roles")
        .onDelete("CASCADE");
      table.primary(["user_id", "role_id"]);
      table.index(["user_id"]);
      table.index(["role_id"]);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("user_roles")
    .dropTableIfExists("role_permissions")
    .dropTableIfExists("permissions")
    .dropTableIfExists("roles");
};
