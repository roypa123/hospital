const express = require("express");
const auditController = require("../controllers/audit.controller");
const { authenticate, requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/", authenticate, requireRole("ADMIN"), auditController.list);

module.exports = router;
