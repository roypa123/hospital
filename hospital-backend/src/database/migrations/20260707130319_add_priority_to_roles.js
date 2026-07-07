exports.up = function (knex) {
  return knex.schema.alterTable("roles", (table) => {
    table.integer("priority").defaultTo(0).notNullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("roles", (table) => {
    table.dropColumn("priority");
  });
};
