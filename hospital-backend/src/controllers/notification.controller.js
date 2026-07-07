const notificationService = require("../services/notification.service");
const { sendSuccess } = require("../shared/response");

class NotificationController {
  async list(req, res, next) {
    try {
      const list = await notificationService.getUserNotifications(req.user.id);
      return sendSuccess(res, "Notifications inbox retrieved successfully", list);
    } catch (error) {
      return next(error);
    }
  }

  async markRead(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await notificationService.markAsRead(id, req.user.id);
      return sendSuccess(res, "Notification marked as read", updated);
    } catch (error) {
      return next(error);
    }
  }

  async markAllRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id);
      return sendSuccess(res, "All notifications marked as read", result);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new NotificationController();
