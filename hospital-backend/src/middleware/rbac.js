const tokenService = require("../services/token.service");
const { UnauthorizedError, ForbiddenError } = require("../shared/errors");

/**
 * Middleware to authenticate requests via Bearer JWT token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Access token is missing or malformed"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = tokenService.verifyAccessToken(token);
    req.user = decoded; // Contains id, email, roles, permissions
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Middleware to enforce that the user holds a specific role
 * @param {string} role Name of required role (e.g. 'ADMIN')
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return next(new UnauthorizedError("Authentication required"));
    }

    const hasRole = req.user.roles.includes(role.toUpperCase());
    if (!hasRole) {
      return next(new ForbiddenError(`Access denied. Role '${role}' required.`));
    }

    return next();
  };
}

/**
 * Middleware to enforce that the user holds a specific permission
 * @param {string} permission Permission string (e.g. 'patient:register')
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return next(new UnauthorizedError("Authentication required"));
    }

    const hasPermission = req.user.permissions.includes(permission);
    if (!hasPermission) {
      return next(new ForbiddenError(`Access denied. Permission '${permission}' required.`));
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
};
