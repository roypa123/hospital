const fs = require("fs");
const { minioClient, bucketName } = require("../config/minio");
const logger = require("../shared/logger");

class StorageService {
  constructor() {
    this.useMinio = false;
  }

  setUseMinio(val) {
    this.useMinio = val;
    if (val) {
      logger.info("StorageService configured to use MinIO Object Storage.");
    } else {
      logger.info("StorageService configured to use Local Filesystem Storage.");
    }
  }

  async uploadFile(fileKey, filePath, mimeType) {
    if (this.useMinio) {
      try {
        const fileStream = fs.createReadStream(filePath);
        const stat = fs.statSync(filePath);
        await minioClient.putObject(bucketName, fileKey, fileStream, stat.size, {
          "Content-Type": mimeType,
        });
        
        // Remove local file parsed by multer
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        logger.info(`File ${fileKey} uploaded successfully to MinIO.`);
        return { storage: "minio", key: fileKey, path: `minio://${fileKey}` };
      } catch (err) {
        logger.error(`MinIO upload failed: ${err.message}. Saving locally.`);
      }
    }

    // Local fallback
    return { storage: "local", key: fileKey, path: filePath };
  }

  async getFileStream(fileKey, localPath) {
    if (this.useMinio && fileKey) {
      try {
        return await minioClient.getObject(bucketName, fileKey);
      } catch (err) {
        logger.warn(`MinIO download failed for key ${fileKey}: ${err.message}. Trying local path fallback.`);
      }
    }

    if (localPath && fs.existsSync(localPath)) {
      return fs.createReadStream(localPath);
    }
    throw new Error("File not found in storage");
  }

  async deleteFile(fileKey, localPath) {
    if (this.useMinio && fileKey) {
      try {
        await minioClient.removeObject(bucketName, fileKey);
        logger.info(`File ${fileKey} deleted from MinIO.`);
      } catch (err) {
        logger.warn(`MinIO delete failed: ${err.message}`);
      }
    }

    if (localPath && fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        logger.info(`Local file deleted: ${localPath}`);
      } catch (err) {
        logger.warn(`Local delete failed: ${err.message}`);
      }
    }
  }
}

module.exports = new StorageService();
