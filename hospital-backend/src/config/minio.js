const Minio = require("minio");
const logger = require("../shared/logger");

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000", 10),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const bucketName = process.env.MINIO_BUCKET || "hospital-documents";

async function initMinio() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, "us-east-1");
      logger.info(`MinIO bucket '${bucketName}' created successfully.`);
    } else {
      logger.info(`MinIO bucket '${bucketName}' already exists.`);
    }
    return true;
  } catch (err) {
    logger.warn(`MinIO initialization failed (running in local filesystem fallback mode): ${err.message}`);
    return false;
  }
}

module.exports = {
  minioClient,
  bucketName,
  initMinio,
};
