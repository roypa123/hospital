const winston = require("winston");
const path = require("path");

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: logFormat,
  defaultMeta: { service: "hospital-service" },
  transports: [
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          let logStr = `[${timestamp}] ${level}: ${message}`;
          if (Object.keys(meta).length > 0 && meta.service !== undefined && Object.keys(meta).length > 1) {
            delete meta.service;
            logStr += ` ${JSON.stringify(meta)}`;
          }
          if (stack) {
            logStr += `\n${stack}`;
          }
          return logStr;
        })
      ),
    })
  );
}

module.exports = logger;
