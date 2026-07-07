const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const logger = require("./src/shared/logger");
const authRoutes = require("./src/routes/auth.routes");
const departmentRoutes = require("./src/routes/department.routes");
const doctorRoutes = require("./src/routes/doctor.routes");
const patientRoutes = require("./src/routes/patient.routes");
const appointmentRoutes = require("./src/routes/appointment.routes");
const medicalRecordRoutes = require("./src/routes/medicalRecord.routes");
const medicineRoutes = require("./src/routes/medicine.routes");
const prescriptionRoutes = require("./src/routes/prescription.routes");
const pharmacyRoutes = require("./src/routes/pharmacy.routes");
const labRoutes = require("./src/routes/lab.routes");
const billingRoutes = require("./src/routes/billing.routes");
const insuranceRoutes = require("./src/routes/insurance.routes");
const errorHandler = require("./src/middleware/errorHandler");

// Import background queue workers to initialize them on startup
require("./src/shared/queue/email.worker");
require("./src/shared/queue/cron.worker");

const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(cookieParser());

// Stream Morgan HTTP logs through Winston logger
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

app.use(express.json());

// Main Root Endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Hospital Management System API running.",
  });
});

// Mount Modules Routes
app.use("/api/auth", authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/laboratory", labRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/insurance", insuranceRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;