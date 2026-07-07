const Redis = require("ioredis");
const logger = require("../shared/logger");

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

let redisClient = null;

try {
  redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null, // Required by BullMQ
    lazyConnect: true,
  });

  redisClient.on("error", (err) => {
    logger.warn(`Redis connection failed: ${err.message}. Ensure Redis is running if queue services are needed.`);
  });

  redisClient.on("connect", () => {
    logger.info("Redis Connected");
  });
} catch (error) {
  logger.error("Error setting up Redis client: ", error);
}

module.exports = redisClient;
