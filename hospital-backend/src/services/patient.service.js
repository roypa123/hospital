const patientRepository = require("../repositories/patient.repository");
const userRepository = require("../repositories/user.repository");
const db = require("../config/knex");
const bcrypt = require("bcrypt");
const { NotFoundError, ConflictError } = require("../shared/errors");

class PatientService {
  async getPatients(filters = {}) {
    return await patientRepository.findAll(filters);
  }

  async getPatientById(id) {
    const patient = await patientRepository.findById(id);
    if (!patient) {
      throw new NotFoundError("Patient profile not found");
    }
    return patient;
  }

  async getPatientByUserId(userId) {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) {
      throw new NotFoundError("Patient profile not found for this user");
    }
    return patient;
  }

  async updatePatient(id, data) {
    await this.getPatientById(id); // Check existence
    return await patientRepository.update(id, data);
  }

  async deletePatient(id) {
    await this.getPatientById(id);
    return await patientRepository.deactivate(id);
  }

  async createPatient(data) {
    const { first_name, last_name, email, date_of_birth, gender, blood_group } = data;
    const emailLower = email.toLowerCase();

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(emailLower);
    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    const passwordHash = await bcrypt.hash("Patient@123!", 10);
    let createdPatient;

    await db.transaction(async (trx) => {
      // 1. Insert user
      const [user] = await trx("users")
        .insert({
          first_name,
          last_name,
          email: emailLower,
          password: passwordHash,
          email_verified: true, // Auto-verify as created by staff
        })
        .returning("*");

      // 2. Fetch role
      const role = await trx("roles").where({ name: "PATIENT" }).first();
      if (!role) {
        throw new NotFoundError("PATIENT role does not exist");
      }

      // 3. Link user to role
      await trx("user_roles").insert({
        user_id: user.id,
        role_id: role.id,
      });

      // 4. Create patient profile
      const [patient] = await trx("patients")
        .insert({
          user_id: user.id,
          date_of_birth: date_of_birth || null,
          gender: gender || null,
          blood_group: blood_group || null,
          allergies: "[]",
        })
        .returning("*");

      createdPatient = {
        ...patient,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      };
    });

    return createdPatient;
  }
}

module.exports = new PatientService();
