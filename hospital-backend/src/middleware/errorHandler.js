const logger = require("../shared/logger");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log error to Winston
  if (err.statusCode === 500) {
    logger.error("Internal Server Error: ", err);
  } else {
    logger.warn(`Client Error [${err.statusCode}]: ${err.message}`, {
      path: req.originalUrl,
      method: req.method,
      errors: err.errors || null,
    });
  }

  // Development output: show stack trace
  if (process.env.NODE_ENV === "development") {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      errors: err.errors || null,
      stack: err.stack,
    });
  }

  // Production output: operational errors are safe to send details
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      errors: err.errors || null,
    });
  }

  // Non-operational or programming errors: hide details from user
  return res.status(500).json({
    success: false,
    status: "error",
    message: "Something went wrong on the server.",
  });
};
