const { Worker } = require("bullmq");
const db = require("../config/knex");
const logger = require("../shared/logger");
const { connection } = require("../shared/queue");

let cronWorker = null;

try {
  cronWorker = new Worker(
    "cron-queue",
    async (job) => {
      logger.info(`Processing background cron job '${job.name}' (ID: ${job.id})`);

      if (job.name === "check-low-stock") {
        const lowStock = await db("medicine_stock")
          .join("medicines", "medicine_stock.medicine_id", "medicines.id")
          .where("medicine_stock.quantity", "<", 20)
          .andWhere("medicine_stock.expiry_date", ">", db.fn.now())
          .select("medicine_stock.*", "medicines.name as medicine_name");

        if (lowStock.length > 0) {
          logger.warn(`[Stock Audit] Found ${lowStock.length} batches with low stock (< 20 units):`);
          lowStock.forEach((item) => {
            logger.warn(`  - Medicine: ${item.medicine_name} | Batch: ${item.batch_number} | Quantity: ${item.quantity}`);
          });
        } else {
          logger.info("[Stock Audit] All active medicine stocks are healthy.");
        }
      }
    },
    {
      connection,
    }
  );

  cronWorker.on("completed", (job) => {
    logger.info(`Background cron job '${job.name}' completed (ID: ${job.id})`);
  });

  cronWorker.on("failed", (job, err) => {
    logger.error(`Background cron job '${job.name}' failed (ID: ${job.id}): ${err.message}`);
  });
} catch (error) {
  logger.error("Error setting up cron BullMQ worker: ", error);
}

module.exports = cronWorker;
