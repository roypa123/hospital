const fs = require("fs");
const documentRepository = require("../repositories/document.repository");
const patientRepository = require("../repositories/patient.repository");
const { NotFoundError, ForbiddenError } = require("../shared/errors");
const logger = require("../shared/logger");

class DocumentService {
  async uploadDocument(patientId, uploaderUserId, fileData, documentType) {
    // 1. Verify patient profile exists
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      // Remove temporary upload file if patient check fails to save disk space
      if (fileData.path && fs.existsSync(fileData.path)) {
        fs.unlinkSync(fileData.path);
      }
      throw new NotFoundError("Patient profile not found");
    }

    return await documentRepository.create({
      patient_id: patientId,
      document_name: fileData.originalname,
      document_type: documentType || "other",
      file_path: fileData.path,
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

    // 1. Remove file from storage disk
    if (fs.existsSync(doc.file_path)) {
      try {
        fs.unlinkSync(doc.file_path);
        logger.info(`Deleted file from disk: ${doc.file_path}`);
      } catch (err) {
        logger.error(`Failed to delete file from disk at ${doc.file_path}: `, err);
      }
    }

    // 2. Remove metadata row from database registry
    return await documentRepository.delete(id);
  }
}

module.exports = new DocumentService();
