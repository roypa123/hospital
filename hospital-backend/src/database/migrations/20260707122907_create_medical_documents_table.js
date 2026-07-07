exports.up = function (knex) {
  return knex.schema.createTable("medical_documents", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("patient_id")
      .notNullable()
      .references("id")
      .inTable("patients")
      .onDelete("CASCADE");
    table.string("document_name", 255).notNullable();
    table.string("document_type", 100).notNullable(); // 'lab_report', 'prescription', 'referral', etc.
    table.string("file_path", 512).notNullable();
    table.integer("file_size").notNullable();
    table.string("mime_type", 100).notNullable();
    table
      .uuid("uploaded_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamps(true, true);

    table.index(["patient_id"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("medical_documents");
};
