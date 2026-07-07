const { Worker } = require("bullmq");
const db = require("../../config/knex");
const logger = require("../logger");
const { connection } = require("./index");

let auditWorker = null;

try {
  auditWorker = new Worker(
    "audit-queue",
    async (job) => {
      logger.info(`Processing background audit log job '${job.name}' (ID: ${job.id})`);
      const { userId, action, resourceType, resourceId, payload, ipAddress } = job.data;

      await db("audit_logs").insert({
        user_id: userId || null,
        action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        payload: payload ? JSON.stringify(payload) : null,
        ip_address: ipAddress || null,
      });
    },
    {
      connection,
      concurrency: 10,
    }
  );

  auditWorker.on("completed", (job) => {
    logger.info(`Background audit job completed (ID: ${job.id})`);
  });

  auditWorker.on("failed", (job, err) => {
    logger.error(`Background audit job failed (ID: ${job.id}): ${err.message}`);
  });
} catch (error) {
  logger.error("Error setting up audit BullMQ worker: ", error);
}

module.exports = auditWorker;
