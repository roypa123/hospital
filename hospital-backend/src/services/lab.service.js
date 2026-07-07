const labRepository = require("../repositories/lab.repository");
const doctorRepository = require("../repositories/doctor.repository");
const patientRepository = require("../repositories/patient.repository");
const { NotFoundError, BadRequestError } = require("../shared/errors");
const notificationService = require("./notification.service");

class LabService {
  async requestLabTest(patientId, doctorUserId, data) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError("Doctor profile not found for authenticated user");
    }

    return await labRepository.create({
      patient_id: patientId,
      doctor_id: doctor.id,
      test_name: data.test_name,
      category: data.category,
      status: "pending",
    });
  }

  async recordResults(id, technicianUserId, data) {
    const test = await labRepository.findById(id);
    if (!test) {
      throw new NotFoundError("Lab test order not found");
    }

    if (test.status !== "pending") {
      throw new BadRequestError(`Cannot upload results for test with status '${test.status}'`);
    }

    const updated = await labRepository.update(id, {
      lab_technician_id: technicianUserId,
      results_summary: data.results_summary,
      findings: data.findings,
      status: "completed",
    });

    // Notify doctor
    notificationService.sendToDoctor(test.doctor_id, "LAB_RESULTS_READY", {
      test_id: id,
      message: `New lab results for ${test.patient_first_name} ${test.patient_last_name} are ready for review.`,
    });

    return updated;
  }

  async approveResults(id, doctorUserId) {
    const test = await labRepository.findById(id);
    if (!test) {
      throw new NotFoundError("Lab test order not found");
    }

    if (test.status !== "completed") {
      throw new BadRequestError(`Cannot approve lab test results that are in status '${test.status}'`);
    }

    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError("Doctor profile not found for authenticated user");
    }

    const updated = await labRepository.update(id, {
      approved_by: doctor.id,
      status: "approved",
    });

    // Notify patient
    const patient = await patientRepository.findById(test.patient_id);
    if (patient) {
      notificationService.sendToUser(patient.user_id, "LAB_RESULTS_APPROVED", {
        test_id: id,
        message: `Your lab results for '${test.test_name}' have been approved.`,
      });
    }

    return updated;
  }

  async getLabTests(filters = {}) {
    return await labRepository.findAll(filters);
  }

  async getLabTestById(id) {
    const test = await labRepository.findById(id);
    if (!test) {
      throw new NotFoundError("Lab test not found");
    }
    return test;
  }
}

module.exports = new LabService();
