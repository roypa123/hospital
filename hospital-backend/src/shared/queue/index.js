const { Queue } = require("bullmq");
const logger = require("../logger");

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
};

let emailQueue = null;
let cronQueue = null;

try {
  emailQueue = new Queue("email-queue", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000, // 2s, 4s, 8s backoff
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  cronQueue = new Queue("cron-queue", {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  logger.info("BullMQ Queues initialized successfully.");
} catch (error) {
  logger.error("Error initializing BullMQ Queues: ", error);
}

module.exports = {
  connection,
  emailQueue,
  cronQueue,
};
