const { getIO } = require("../config/socket");
const doctorRepository = require("../repositories/doctor.repository");
const logger = require("../shared/logger");

class NotificationService {
  sendToUser(userId, event, payload) {
    const io = getIO();
    if (io) {
      io.of("/notifications").to(`user:${userId}`).emit(event, payload);
      logger.info(`Websocket notification '${event}' sent to user room user:${userId}`);
    } else {
      logger.warn("Websocket IO not initialized, skipping notification send.");
    }
  }

  async sendToDoctor(doctorId, event, payload) {
    try {
      const doctor = await doctorRepository.findById(doctorId);
      if (doctor && doctor.user_id) {
        this.sendToUser(doctor.user_id, event, payload);
      } else {
        logger.warn(`Could not resolve doctor profile for ID: ${doctorId} to send websocket event`);
      }
    } catch (err) {
      logger.error(`Error resolving doctor ID for websocket alert: ${err.message}`);
    }
  }

  sendToRole(roleName, event, payload) {
    const io = getIO();
    if (io) {
      io.of("/notifications").to(`role:${roleName.toUpperCase()}`).emit(event, payload);
      logger.info(`Websocket notification '${event}' sent to role room role:${roleName}`);
    }
  }
}

module.exports = new NotificationService();
