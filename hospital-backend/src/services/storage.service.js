const { minioClient, bucketName } = require("../config/minio");
const logger = require("../shared/logger");

class StorageService {
  async uploadFile(fileKey, buffer, mimeType) {
    await minioClient.putObject(bucketName, fileKey, buffer, buffer.length, {
      "Content-Type": mimeType,
    });
    logger.info(`File ${fileKey} uploaded successfully to MinIO.`);
    return { storage: "minio", key: fileKey, path: `minio://${fileKey}` };
  }

  async getFileStream(fileKey) {
    return await minioClient.getObject(bucketName, fileKey);
  }

  async deleteFile(fileKey) {
    await minioClient.removeObject(bucketName, fileKey);
    logger.info(`File ${fileKey} deleted from MinIO.`);
  }
}

module.exports = new StorageService();
