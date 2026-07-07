exports.up = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.timestamp("last_login");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.dropColumn("last_login");
  });
};
