const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const jwtConfig = require("./jwt");
const logger = require("../shared/logger");

let ioInstance = null;

function initSocketServer(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const notificationsNamespace = ioInstance.of("/notifications");

  // JWT handshake authentication middleware
  notificationsNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(token, jwtConfig.accessSecret, (err, decoded) => {
      if (err) {
        logger.warn(`Websocket auth handshake failed: ${err.message}`);
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.user = decoded; // Decoded payload includes id (users.id), email, roles
      next();
    });
  });

  notificationsNamespace.on("connection", (socket) => {
    const userId = socket.user.id;
    logger.info(`Websocket subscriber connected: User ID ${userId} (Socket ID: ${socket.id})`);

    // 1. Join personal user room
    socket.join(`user:${userId}`);

    // 2. Join roles-based rooms
    if (socket.user.roles) {
      socket.user.roles.forEach((role) => {
        socket.join(`role:${role}`);
        logger.info(`Socket subscriber ${userId} joined room 'role:${role}'`);
      });
    }

    socket.on("disconnect", () => {
      logger.info(`Websocket subscriber disconnected: User ID ${userId}`);
    });
  });

  logger.info("Socket.IO server initialized successfully.");
  return ioInstance;
}

function getIO() {
  return ioInstance;
}

module.exports = {
  initSocketServer,
  getIO,
};
