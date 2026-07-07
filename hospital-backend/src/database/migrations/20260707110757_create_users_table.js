exports.up = function (knex) {

    return knex.schema.createTable("users", table => {

        table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

        table.string("first_name", 100).notNullable();

        table.string("last_name", 100);

        table.string("email", 255).unique().notNullable();

        table.string("password", 255).notNullable();

        table.boolean("email_verified").defaultTo(false);

        table.timestamp("created_at").defaultTo(knex.fn.now());

        table.timestamp("updated_at").defaultTo(knex.fn.now());

    });

};

exports.down = function (knex) {

    return knex.schema.dropTable("users");

};
