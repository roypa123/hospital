const doctorRepository = require("../repositories/doctor.repository");
const departmentRepository = require("../repositories/department.repository");
const { NotFoundError, BadRequestError, ConflictError } = require("../shared/errors");

class DoctorService {
  async getDoctors(filters = {}) {
    return await doctorRepository.findAll(filters);
  }

  async getDoctorById(id) {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) {
      throw new NotFoundError("Doctor profile not found");
    }
    return doctor;
  }

  async getDoctorByUserId(userId) {
    const doctor = await doctorRepository.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError("Doctor profile not found for this user");
    }
    return doctor;
  }

  async updateDoctor(id, data) {
    const doctor = await this.getDoctorById(id);

    if (data.department_id) {
      const dept = await departmentRepository.findById(data.department_id);
      if (!dept) {
        throw new NotFoundError("Department not found");
      }
    }

    if (data.license_number && data.license_number !== doctor.license_number) {
      // Check license uniqueness
      const allDocs = await doctorRepository.findAll({ is_active: true });
      const dup = allDocs.find((d) => d.license_number === data.license_number);
      if (dup) {
        throw new ConflictError("License number already registered");
      }
    }

    return await doctorRepository.update(id, data);
  }

  async deleteDoctor(id) {
    await this.getDoctorById(id);
    return await doctorRepository.deactivate(id);
  }

  // --- SCHEDULES MANAGEMENTS ---

  async getDoctorSchedules(doctorId) {
    await this.getDoctorById(doctorId);
    return await doctorRepository.getSchedules(doctorId);
  }

  async addDoctorSchedule(doctorId, scheduleData) {
    await this.getDoctorById(doctorId);

    const { day_of_week, start_time, end_time, slot_duration } = scheduleData;
    if (day_of_week < 0 || day_of_week > 6) {
      throw new BadRequestError("day_of_week must be between 0 (Sunday) and 6 (Saturday)");
    }

    // Check if schedule for this day already exists
    const existing = await doctorRepository.findSchedule(doctorId, day_of_week);
    if (existing) {
      throw new ConflictError("Schedule template already exists for this day. Update or delete the existing one first.");
    }

    return await doctorRepository.createSchedule({
      doctor_id: doctorId,
      day_of_week,
      start_time,
      end_time,
      slot_duration: slot_duration || 30,
    });
  }

  async removeDoctorSchedule(scheduleId) {
    // Check if exists
    return await doctorRepository.deleteSchedule(scheduleId);
  }
}

module.exports = new DoctorService();
