const labRepository = require("../repositories/lab.repository");
const doctorRepository = require("../repositories/doctor.repository");
const { NotFoundError, BadRequestError } = require("../shared/errors");

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

    return await labRepository.update(id, {
      lab_technician_id: technicianUserId,
      results_summary: data.results_summary,
      findings: data.findings,
      status: "completed",
    });
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

    return await labRepository.update(id, {
      approved_by: doctor.id,
      status: "approved",
    });
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
