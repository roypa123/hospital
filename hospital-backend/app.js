const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const logger = require("./src/shared/logger");
const authRoutes = require("./src/routes/auth.routes");
const errorHandler = require("./src/middleware/errorHandler");

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

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;