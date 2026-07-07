const db = require("../config/knex");
const appointmentRepository = require("../repositories/appointment.repository");
const doctorRepository = require("../repositories/doctor.repository");
const patientRepository = require("../repositories/patient.repository");
const { NotFoundError, BadRequestError, ConflictError, ForbiddenError } = require("../shared/errors");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");

class AppointmentService {
  /**
   * Helper to parse date string into local day of week (0-6) without timezone offset issues
   */
  _getLocalDayOfWeek(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day).getDay();
  }

  /**
   * Helper to generate slots time intervals
   */
  _generateTimeIntervals(dateString, startTime, endTime, duration) {
    const slots = [];
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + duration <= endMinutes) {
      const startHStr = String(Math.floor(currentMinutes / 60)).padStart(2, "0");
      const startMStr = String(currentMinutes % 60).padStart(2, "0");
      
      const endMinutesVal = currentMinutes + duration;
      const endHStr = String(Math.floor(endMinutesVal / 60)).padStart(2, "0");
      const endMStr = String(endMinutesVal % 60).padStart(2, "0");

      slots.push({
        date: dateString,
        start_time: `${startHStr}:${startMStr}:00`,
        end_time: `${endHStr}:${endMStr}:00`,
        status: "available",
        version: 1,
      });

      currentMinutes += duration;
    }
    return slots;
  }

  /**
   * Generates appointment slots for a doctor on a specific date based on their schedule template
   */
  async generateSlots(doctorId, dateString) {
    // 1. Verify doctor exists
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError("Doctor profile not found");
    }

    // 2. Identify day of week
    const dayOfWeek = this._getLocalDayOfWeek(dateString);

    // 3. Find schedule template
    const schedule = await doctorRepository.findSchedule(doctorId, dayOfWeek);
    if (!schedule) {
      throw new BadRequestError(`Doctor has no active schedule template configured for ${dateString} (Day: ${dayOfWeek})`);
    }

    // 4. Generate candidate slots
    const candidateSlots = this._generateTimeIntervals(
      dateString,
      schedule.start_time,
      schedule.end_time,
      schedule.slot_duration
    );

    // 5. Fetch existing slots to avoid duplicates
    const existingSlots = await appointmentRepository.findSlotsByDoctorAndDate(doctorId, dateString);
    const existingTimes = new Set(existingSlots.map((s) => s.start_time));

    const newSlots = candidateSlots
      .filter((s) => !existingTimes.has(s.start_time))
      .map((s) => ({
        doctor_id: doctorId,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        status: s.status,
        version: s.version,
      }));

    if (newSlots.length > 0) {
      await appointmentRepository.createSlotsBulk(newSlots);
    }

    // Return all slots (existing + newly generated)
    return await appointmentRepository.findSlotsByDoctorAndDate(doctorId, dateString);
  }

  /**
   * Lists slots for a doctor and date (auto-generates if not present)
   */
  async getSlotsForDoctorAndDate(doctorId, dateString) {
    try {
      return await this.generateSlots(doctorId, dateString);
    } catch (error) {
      // If generate fails (e.g. doctor has no schedule), just return empty list or throw if requested
      if (error instanceof NotFoundError) throw error;
      return []; // Return empty list if no schedule exists
    }
  }

  /**
   * Books an appointment slot using optimistic locking in a transaction
   */
  async bookAppointment(patientId, doctorId, slotId, visitType, reason) {
    // Execute inside transaction
    return await db.transaction(async (trx) => {
      // 1. Fetch slot with locking (to prevent dirty reads in transaction)
      const slot = await appointmentRepository.findSlotByIdWithLock(slotId, trx);
      if (!slot) {
        throw new NotFoundError("Appointment slot not found");
      }

      if (slot.status !== "available") {
        throw new ConflictError("This slot has already been booked by another request. Choose a different time.");
      }

      if (slot.doctor_id !== doctorId) {
        throw new BadRequestError("Slot doctor mismatch");
      }

      // 2. Perform Optimistic Locking update
      const booked = await appointmentRepository.bookSlotOptimistic(slotId, slot.version, trx);
      if (!booked) {
        throw new ConflictError("Booking failed due to concurrent update. The slot was just reserved by another user.");
      }

      // 3. Create appointment record
      const appointment = await appointmentRepository.createAppointment(
        {
          patient_id: patientId,
          doctor_id: doctorId,
          slot_id: slotId,
          appointment_date: slot.date,
          status: "scheduled",
          visit_type: visitType || "consultation",
          reason_for_visit: reason || "",
        },
        trx
      );

      // Log audit trail
      const patient = await patientRepository.findById(patientId);
      if (patient) {
        auditService.log(patient.user_id, "APPOINTMENT_BOOKED", "appointments", appointment.id, { slot_id: slotId });
      }

      // Trigger real-time alert
      notificationService.sendToDoctor(doctorId, "APPOINTMENT_BOOKED", {
        appointment_id: appointment.id,
        message: "A new appointment has been scheduled.",
      });

      return appointment;
    });
  }

  /**
   * Cancels a scheduled appointment. Uses ABAC check to restrict users.
   */
  async cancelAppointment(appointmentId, userId, roles) {
    const appointment = await appointmentRepository.findAppointmentById(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Appointment not found");
    }

    if (appointment.status === "cancelled" || appointment.status === "completed") {
      throw new BadRequestError(`Cannot cancel appointment with status '${appointment.status}'`);
    }

    const isAdminOrReceptionist = roles.includes("ADMIN") || roles.includes("RECEPTIONIST");

    // Enforce ABAC for PATIENT role: patients can only cancel their own appointments
    if (!isAdminOrReceptionist && roles.includes("PATIENT")) {
      const patient = await patientRepository.findByUserId(userId);
      if (!patient || patient.id !== appointment.patient_id) {
        throw new ForbiddenError("Forbidden: You can only cancel your own appointments");
      }
    }

    return await db.transaction(async (trx) => {
      // 1. Update appointment status
      const updated = await appointmentRepository.updateAppointment(
        appointmentId,
        { status: "cancelled" },
        trx
      );

      // 2. Release slot back to available
      await appointmentRepository.releaseSlot(appointment.slot_id, trx);

      // Log audit trail
      auditService.log(userId, "APPOINTMENT_CANCELLED", "appointments", appointmentId);

      return updated;
    });
  }

  /**
   * Queries appointments with filters
   */
  async getAppointments(filters) {
    return await appointmentRepository.findAppointments(filters);
  }

  /**
   * Fetch appointment by ID
   */
  async getAppointmentById(id) {
    const appt = await appointmentRepository.findAppointmentById(id);
    if (!appt) {
      throw new NotFoundError("Appointment not found");
    }
    return appt;
  }

  /**
   * Workflow state engine updater (scheduled -> checked_in -> consultation -> completed)
   */
  async updateStatus(appointmentId, status, notes = null) {
    const appointment = await appointmentRepository.findAppointmentById(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Appointment not found");
    }

    const validTransitions = {
      scheduled: ["checked_in", "cancelled"],
      checked_in: ["consultation", "cancelled"],
      consultation: ["completed"],
      completed: [],
      cancelled: [],
    };

    const currentStatus = appointment.status;
    const allowed = validTransitions[currentStatus];

    if (!allowed || !allowed.includes(status)) {
      throw new BadRequestError(`Invalid status transition from '${currentStatus}' to '${status}'`);
    }

    const updatePayload = { status };
    if (notes) {
      updatePayload.notes = notes;
    }

    const updated = await appointmentRepository.updateAppointment(appointmentId, updatePayload);

    // Trigger real-time alert on check-in
    if (status === "checked_in") {
      notificationService.sendToDoctor(appointment.doctor_id, "APPOINTMENT_CHECKED_IN", {
        appointment_id: appointmentId,
        message: "Your patient has checked in and is waiting.",
      });
    }

    return updated;
  }
}

module.exports = new AppointmentService();
