const { getIO } = require("../config/socket");
const doctorRepository = require("../repositories/doctor.repository");
const notificationRepository = require("../repositories/notification.repository");
const logger = require("../shared/logger");

class NotificationService {
  async sendToUser(userId, event, payload) {
    // Determine title & message
    const title = payload.title || event.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const message = payload.message || JSON.stringify(payload);

    let dbNotif = null;
    try {
      dbNotif = await notificationRepository.create({
        user_id: userId,
        title,
        message,
      });
    } catch (dbErr) {
      logger.error(`Failed to persist notification in database: ${dbErr.message}`);
    }

    const io = getIO();
    if (io) {
      const broadcastPayload = dbNotif ? dbNotif : { title, message, created_at: new Date() };
      io.of("/notifications").to(`user:${userId}`).emit(event, broadcastPayload);
      logger.info(`Websocket notification '${event}' sent to user room user:${userId}`);
    } else {
      logger.warn("Websocket IO not initialized, skipping notification broadcast.");
    }
  }

  async sendToDoctor(doctorId, event, payload) {
    try {
      const doctor = await doctorRepository.findById(doctorId);
      if (doctor && doctor.user_id) {
        await this.sendToUser(doctor.user_id, event, payload);
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

  async getUserNotifications(userId) {
    return await notificationRepository.findByUserId(userId);
  }

  async markAsRead(id, userId) {
    return await notificationRepository.markAsRead(id, userId);
  }

  async markAllAsRead(userId) {
    return await notificationRepository.markAllAsRead(userId);
  }
}

module.exports = new NotificationService();
