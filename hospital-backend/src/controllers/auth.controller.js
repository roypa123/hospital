const authService = require("../services/auth.service");
const sessionService = require("../services/session.service");
const { sendSuccess } = require("../shared/response");

class AuthController {
  /**
   * Registers a patient or customized user role
   */
  async register(req, res, next) {
    try {
      const { role } = req.query; // Support passing registration role via query, fallback PATIENT
      const user = await authService.register(req.body, role || "PATIENT");
      return sendSuccess(res, "User registered successfully. Verification email has been sent.", user, 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Authenticates user credentials and initiates session
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password, req);
      
      if (result.mfaRequired) {
        return sendSuccess(res, "Multi-Factor Authentication is active for this account. Provide OTP code.", {
          mfaRequired: true,
          tempToken: result.tempToken,
        });
      }

      return sendSuccess(res, "Login successful", {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Completes login check with MFA code verification
   */
  async verifyLoginMFA(req, res, next) {
    try {
      const { tempToken, code } = req.body;
      const result = await authService.login2FA(tempToken, code, req);

      return sendSuccess(res, "MFA code verified. Login successful", {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Refreshes expired access tokens
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);
      return sendSuccess(res, "Access token refreshed successfully", result);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Terminates session and invalidates refresh token
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const { sessionId } = req.query; // Optional session id if logout request can provide it
      await authService.logout(refreshToken, sessionId);
      return sendSuccess(res, "Logged out successfully");
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Starts password reset flow
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      // Uniform success message to prevent user enumeration
      return sendSuccess(res, "If your email is registered in our system, a password reset link has been dispatched.");
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Resets password using verification token
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      await authService.resetPassword(token, password);
      return sendSuccess(res, "Your password has been reset successfully. Active sessions have been invalidated.");
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Verifies email using verification token
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;
      await authService.verifyEmail(token);
      return sendSuccess(res, "Your email address has been verified successfully.");
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Initiates 2FA setup for user
   */
  async setup2FA(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await authService.enable2FA(userId);
      return sendSuccess(res, "2FA setup secret generated. Scan QR code to bind authenticator.", result);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Confirms 2FA activation with a verification token
   */
  async activate2FA(req, res, next) {
    try {
      const userId = req.user.id;
      const { code } = req.body;
      const result = await authService.verifyAndEnable2FA(userId, code);
      return sendSuccess(res, "2FA activated successfully. Store backup codes securely.", result);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Lists active login sessions for user
   */
  async listActiveSessions(req, res, next) {
    try {
      const userId = req.user.id;
      const sessions = await sessionService.getActiveSessions(userId);
      return sendSuccess(res, "Active sessions fetched successfully", sessions);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Revokes/closes login session
   */
  async revokeSession(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Security check: verify session belongs to authenticated user
      const targetSession = await sessionService.touchSession(id); // Returns session data or checks active status
      if (!targetSession || targetSession.user_id !== userId) {
        return res.status(403).json({ success: false, message: "Forbidden: You cannot revoke another user's session" });
      }

      await sessionService.closeSession(id);
      return sendSuccess(res, "Session terminated successfully");
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AuthController();
