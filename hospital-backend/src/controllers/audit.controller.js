const auditService = require("../services/audit.service");
const { sendSuccess } = require("../shared/response");

class AuditController {
  async list(req, res, next) {
    try {
      const logs = await auditService.getLogs(req.query);
      return sendSuccess(res, "Audit compliance logs retrieved successfully", logs);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AuditController();
