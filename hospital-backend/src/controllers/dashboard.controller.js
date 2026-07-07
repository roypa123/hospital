const dashboardService = require("../services/dashboard.service");
const { sendSuccess } = require("../shared/response");

class DashboardController {
  async getAdminDashboard(req, res, next) {
    try {
      const metrics = await dashboardService.getAdminMetrics();
      return sendSuccess(res, "Admin dashboard metrics retrieved", metrics);
    } catch (error) {
      return next(error);
    }
  }

  async getDoctorDashboard(req, res, next) {
    try {
      const metrics = await dashboardService.getDoctorMetrics(req.user.id);
      return sendSuccess(res, "Doctor dashboard metrics retrieved", metrics);
    } catch (error) {
      return next(error);
    }
  }

  async getPatientDashboard(req, res, next) {
    try {
      const metrics = await dashboardService.getPatientMetrics(req.user.id);
      return sendSuccess(res, "Patient dashboard metrics retrieved", metrics);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new DashboardController();
