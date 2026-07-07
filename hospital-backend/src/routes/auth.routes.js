const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/auth.controller");
const validateRequest = require("../shared/validator");
const { authenticate } = require("../middleware/rbac");

const router = express.Router();

// 1. Registration
router.post(
  "/register",
  validateRequest([
    body("email").isEmail().withMessage("Provide a valid email address"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    body("first_name").trim().notEmpty().withMessage("First name is required"),
    body("last_name").optional().trim(),
    body("date_of_birth").optional().isISO8601().withMessage("Provide a valid date of birth (YYYY-MM-DD)"),
    body("gender").optional().isIn(["Male", "Female", "Other", "Prefer not to say"]).withMessage("Invalid gender category"),
    body("blood_group").optional().isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).withMessage("Invalid blood group"),
  ]),
  authController.register
);

// 2. Authentication Login
router.post(
  "/login",
  validateRequest([
    body("email").isEmail().withMessage("Provide a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ]),
  authController.login
);

// 3. Complete MFA Login
router.post(
  "/login/mfa",
  validateRequest([
    body("tempToken").notEmpty().withMessage("Temporary login token is required"),
    body("code").isLength({ min: 6, max: 6 }).withMessage("MFA verification code must be exactly 6 digits"),
  ]),
  authController.verifyLoginMFA
);

// 4. Refresh Token
router.post(
  "/refresh",
  validateRequest([
    body("refreshToken").notEmpty().withMessage("Refresh token is required"),
  ]),
  authController.refresh
);

// 5. Logout
router.post(
  "/logout",
  validateRequest([
    body("refreshToken").optional().notEmpty().withMessage("Refresh token cannot be empty"),
  ]),
  authController.logout
);

// 6. Forgot Password
router.post(
  "/forgot-password",
  validateRequest([
    body("email").isEmail().withMessage("Provide a valid email address"),
  ]),
  authController.forgotPassword
);

// 7. Reset Password
router.post(
  "/reset-password",
  validateRequest([
    body("token").notEmpty().withMessage("Password reset token is required"),
    body("password").isLength({ min: 6 }).withMessage("New password must be at least 6 characters long"),
  ]),
  authController.resetPassword
);

// 8. Verify Email
router.post(
  "/verify-email",
  validateRequest([
    body("token").notEmpty().withMessage("Email verification token is required"),
  ]),
  authController.verifyEmail
);

// --- PROTECTED ROUTES (Require Authentication) ---

// 9. Setup 2FA
router.post("/2fa/setup", authenticate, authController.setup2FA);

// 10. Activate 2FA
router.post(
  "/2fa/activate",
  authenticate,
  validateRequest([
    body("code").isLength({ min: 6, max: 6 }).withMessage("Verification code must be exactly 6 digits"),
  ]),
  authController.activate2FA
);

// 11. Sessions Management
router.get("/sessions", authenticate, authController.listActiveSessions);
router.delete("/sessions/:id", authenticate, authController.revokeSession);

module.exports = router;
