const db = require("../config/knex");
const { auditQueue } = require("../shared/queue");
const logger = require("../shared/logger");

class AuditService {
  /**
   * Pushes an audit trail job to the background queue, falling back to direct DB write if Redis is down.
   */
  async log(userId, action, resourceType, resourceId, payload = {}, ipAddress = null) {
    const jobData = {
      userId,
      action,
      resourceType,
      resourceId,
      payload,
      ipAddress,
    };

    if (auditQueue) {
      try {
        await auditQueue.add("log-audit-event", jobData);
      } catch (err) {
        logger.error(`Failed to enqueue audit job, falling back to direct DB insert: ${err.message}`);
        await this._writeDirectly(jobData);
      }
    } else {
      await this._writeDirectly(jobData);
    }
  }

  async _writeDirectly(data) {
    try {
      await db("audit_logs").insert({
        user_id: data.userId || null,
        action: data.action,
        resource_type: data.resourceType,
        resource_id: data.resourceId || null,
        payload: data.payload ? JSON.stringify(data.payload) : null,
        ip_address: data.ipAddress || null,
      });
    } catch (dbErr) {
      logger.error(`Critical: Direct database audit log write failed: ${dbErr.message}`);
    }
  }

  async getLogs(filters = {}) {
    const query = db("audit_logs")
      .leftJoin("users", "audit_logs.user_id", "users.id")
      .select(
        "audit_logs.*",
        "users.first_name as user_first_name",
        "users.last_name as user_last_name",
        "users.email as user_email"
      );

    if (filters.action) {
      query.where("audit_logs.action", filters.action);
    }
    if (filters.user_id) {
      query.where("audit_logs.user_id", filters.user_id);
    }
    if (filters.resource_type) {
      query.where("audit_logs.resource_type", filters.resource_type);
    }
    if (filters.resource_id) {
      query.where("audit_logs.resource_id", filters.resource_id);
    }

    return await query.orderBy("audit_logs.created_at", "desc");
  }
}

module.exports = new AuditService();
