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
function requireRole(roles) {
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  const upperRequiredRoles = rolesArray.map((r) => r.toUpperCase());

  return async (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return next(new UnauthorizedError("Authentication required"));
    }

    // 1. Direct role match check (fast-path)
    const hasExactRole = req.user.roles.some((r) =>
      upperRequiredRoles.includes(r.toUpperCase())
    );
    if (hasExactRole) {
      return next();
    }

    // 2. Hierarchical priority check from database (dynamic role priorities 0-100)
    try {
      const db = require("../config/knex");

      const dbRoles = await db("roles").whereIn("name", upperRequiredRoles);
      if (dbRoles.length === 0) {
        return next(
          new ForbiddenError(
            `Access denied. One of roles '${rolesArray.join(", ")}' required.`
          )
        );
      }

      // Minimum priority required to pass
      const minRequiredPriority = Math.min(...dbRoles.map((r) => r.priority));

      // Resolve user's maximum role priority dynamically from the database
      const userDbRoles = await db("roles")
        .join("user_roles", "roles.id", "user_roles.role_id")
        .where("user_roles.user_id", req.user.id)
        .select("roles.priority");
      const userMaxPriority = Math.max(...userDbRoles.map((r) => r.priority), 0);

      if (userMaxPriority >= minRequiredPriority) {
        return next();
      }

      return next(
        new ForbiddenError(
          `Access denied. Required minimum role priority: ${minRequiredPriority}, User maximum role priority: ${userMaxPriority}.`
        )
      );
    } catch (error) {
      return next(error);
    }
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
