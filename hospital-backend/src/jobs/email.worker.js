const { Worker } = require("bullmq");
const emailService = require("../services/email.service");
const logger = require("../shared/logger");
const { connection } = require("../shared/queue");

let emailWorker = null;

try {
  emailWorker = new Worker(
    "email-queue",
    async (job) => {
      logger.info(`Processing background email job '${job.name}' (ID: ${job.id})`);
      const { email, token, sessionDetails } = job.data;

      switch (job.name) {
        case "send-verification":
          await emailService.sendVerificationEmail(email, token);
          break;
        case "send-password-reset":
          await emailService.sendPasswordResetEmail(email, token);
          break;
        case "send-session-alert":
          await emailService.sendSessionAlertEmail(email, sessionDetails);
          break;
        default:
          logger.warn(`Unknown email job type: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 5,
    }
  );

  emailWorker.on("completed", (job) => {
    logger.info(`Background email job '${job.name}' completed (ID: ${job.id})`);
  });

  emailWorker.on("failed", (job, err) => {
    logger.error(`Background email job '${job.name}' failed (ID: ${job.id}): ${err.message}`);
  });
} catch (error) {
  logger.error("Error setting up email BullMQ worker: ", error);
}

module.exports = emailWorker;
