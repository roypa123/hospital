const fs = require("fs");
const documentService = require("../services/document.service");
const patientRepository = require("../repositories/patient.repository");
const { sendSuccess } = require("../shared/response");
const { BadRequestError, ForbiddenError } = require("../shared/errors");

class DocumentController {
  async upload(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError("File attachment is required");
      }

      const { patient_id, document_type } = req.body;
      if (!patient_id) {
        // Remove parsed file if validation fail
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        throw new BadRequestError("patient_id is required");
      }

      const doc = await documentService.uploadDocument(patient_id, req.user.id, req.file, document_type);
      return sendSuccess(res, "Medical document uploaded successfully", doc, 201);
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      let { patient_id } = req.query;
      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"].includes(r)
      );

      // ABAC patient check
      if (!isStaff && req.user.roles.includes("PATIENT")) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient) {
          return sendSuccess(res, "Medical documents list", []);
        }
        patient_id = patient.id;
      }

      if (!patient_id) {
        throw new BadRequestError("patient_id query parameter is required for staff listing");
      }

      const list = await documentService.getPatientDocuments(patient_id);
      return sendSuccess(res, "Medical documents retrieved", list);
    } catch (error) {
      return next(error);
    }
  }

  async download(req, res, next) {
    try {
      const doc = await documentService.getDocumentById(req.params.id);
      const isStaff = req.user.roles.some((r) =>
        ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"].includes(r)
      );

      // ABAC: Patient boundary check
      if (!isStaff) {
        const patient = await patientRepository.findByUserId(req.user.id);
        if (!patient || patient.id !== doc.patient_id) {
          throw new ForbiddenError("Forbidden: You cannot access another patient's medical files");
        }
      }

      if (!fs.existsSync(doc.file_path)) {
        return res.status(404).json({ success: false, message: "Physical file not found in storage" });
      }

      // Stream file directly to client
      res.setHeader("Content-Disposition", `attachment; filename="${doc.document_name}"`);
      res.setHeader("Content-Type", doc.mime_type);
      fs.createReadStream(doc.file_path).pipe(res);
    } catch (error) {
      return next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await documentService.deleteDocument(req.params.id, req.user.id, req.user.roles);
      return sendSuccess(res, "Medical document deleted successfully");
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new DocumentController();
