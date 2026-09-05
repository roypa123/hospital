const path = require("path");
const crypto = require("crypto");
const documentRepository = require("../repositories/document.repository");
const patientRepository = require("../repositories/patient.repository");
const storageService = require("./storage.service");
const { NotFoundError, ForbiddenError } = require("../shared/errors");
const logger = require("../shared/logger");

class DocumentService {
  async uploadDocument(patientId, uploaderUserId, fileData, documentType) {
    // 1. Verify patient profile exists
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundError("Patient profile not found");
    }

    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    const fileKey = `${uniqueSuffix}${path.extname(fileData.originalname)}`;

    const uploadResult = await storageService.uploadFile(fileKey, fileData.buffer, fileData.mimetype);

    return await documentRepository.create({
      patient_id: patientId,
      document_name: fileData.originalname,
      document_type: documentType || "other",
      file_path: uploadResult.path,
      file_size: fileData.size,
      mime_type: fileData.mimetype,
      uploaded_by: uploaderUserId,
    });
  }

  async getDocumentById(id) {
    const doc = await documentRepository.findById(id);
    if (!doc) {
      throw new NotFoundError("Medical document not found");
    }
    return doc;
  }

  async getPatientDocuments(patientId) {
    return await documentRepository.findByPatientId(patientId);
  }

  async deleteDocument(id, actorUserId, roles) {
    const doc = await this.getDocumentById(id);

    const isAdmin = roles.includes("ADMIN");
    const isUploader = doc.uploaded_by === actorUserId;

    if (!isAdmin && !isUploader) {
      throw new ForbiddenError("Forbidden: You are not authorized to delete this document");
    }

    // 1. Remove file from storage
    const minioKey = doc.file_path.replace("minio://", "");
    await storageService.deleteFile(minioKey);

    // 2. Remove metadata row from database registry
    return await documentRepository.delete(id);
  }
}

module.exports = new DocumentService();
