const db = require("../config/knex");

class DocumentRepository {
  async create(data) {
    const [doc] = await db("medical_documents").insert(data).returning("*");
    return doc;
  }

  async findById(id) {
    return await db("medical_documents").where({ id }).first();
  }

  async findByPatientId(patientId) {
    return await db("medical_documents")
      .where({ patient_id: patientId })
      .orderBy("created_at", "desc");
  }

  async delete(id) {
    return await db("medical_documents").where({ id }).del();
  }
}

module.exports = new DocumentRepository();
