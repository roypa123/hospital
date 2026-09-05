const express = require("express");
const multer = require("multer");
const documentController = require("../controllers/document.controller");
const { authenticate } = require("../middleware/rbac");
const { BadRequestError } = require("../shared/errors");

const router = express.Router();

// In-memory storage: files are buffered in RAM and streamed straight to MinIO,
// never touching local disk.
const storage = multer.memoryStorage();

// Multer Filter: Enforce PDF, PNG, JPG, GIF
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError("Only PDF, JPEG, PNG, and GIF clinical files are permitted."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes limit
  },
});

// REST Endpoints
// POST upload single form-data field named 'file'
router.post("/", authenticate, upload.single("file"), documentController.upload);

router.get("/", authenticate, documentController.list);
router.get("/:id/download", authenticate, documentController.download);
router.delete("/:id", authenticate, documentController.delete);

module.exports = router;
