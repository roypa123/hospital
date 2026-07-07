const patientRepository = require("../repositories/patient.repository");
const { NotFoundError } = require("../shared/errors");

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
}

module.exports = new PatientService();
