const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("../config/knex");

const userRepository = require("../repositories/user.repository");
const refreshTokenRepository = require("../repositories/refreshToken.repository");
const sessionRepository = require("../repositories/session.repository");
const emailVerificationRepository = require("../repositories/emailVerification.repository");
const passwordResetRepository = require("../repositories/passwordReset.repository");
const twoFactorRepository = require("../repositories/twoFactor.repository");

const tokenService = require("./token.service");
const sessionService = require("./session.service");
const emailService = require("./email.service");
const otpService = require("./otp.service");
const { emailQueue } = require("../shared/queue");
const auditService = require("./audit.service");

const {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} = require("../shared/errors");

class AuthService {
  /**
   * Registers a new user and creates their role assignment and (if patient/doctor) profile
   */
  async register(userData, roleName = "PATIENT", req = null) {
    const email = userData.email.toLowerCase();

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);
    let createdUser;

    // Use a transaction to ensure all table records are created or rolled back together
    await db.transaction(async (trx) => {
      // 1. Insert user
      const [user] = await trx("users")
        .insert({
          first_name: userData.first_name,
          last_name: userData.last_name,
          email,
          password: passwordHash,
          email_verified: false,
        })
        .returning("*");

      createdUser = user;

      // 2. Fetch role
      const role = await trx("roles").where({ name: roleName.toUpperCase() }).first();
      if (!role) {
        throw new NotFoundError(`Role ${roleName} does not exist`);
      }

      // 3. Link user to role
      await trx("user_roles").insert({
        user_id: user.id,
        role_id: role.id,
      });

      // 4. Create patient profile if role is PATIENT
      if (roleName.toUpperCase() === "PATIENT") {
        await trx("patients").insert({
          user_id: user.id,
          date_of_birth: userData.date_of_birth || null,
          gender: userData.gender || null,
          blood_group: userData.blood_group || null,
          allergies: JSON.stringify(userData.allergies || []),
          emergency_contact: userData.emergency_contact ? JSON.stringify(userData.emergency_contact) : null,
          insurance_details: userData.insurance_details ? JSON.stringify(userData.insurance_details) : null,
        });
      }

      // 5. Create doctor profile if role is DOCTOR
      if (roleName.toUpperCase() === "DOCTOR") {
        await trx("doctors").insert({
          user_id: user.id,
          department_id: userData.department_id || null,
          specialization: userData.specialization || null,
          qualification: userData.qualification || null,
          consultation_fee: userData.consultation_fee || 0,
          room_number: userData.room_number || null,
          experience_years: userData.experience_years || 0,
          license_number: userData.license_number || `LIC-${Date.now()}`,
        });
      }
    });

    // 6. Generate email verification token outside transaction
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await emailVerificationRepository.create({
      user_id: createdUser.id,
      token: verificationToken,
      expires_at: expiresAt,
    });

    // Dispatch email job via background queue
    if (emailQueue) {
      emailQueue.add("send-verification", { email: createdUser.email, token: verificationToken }).catch(() => {
        emailService.sendVerificationEmail(createdUser.email, verificationToken);
      });
    } else {
      emailService.sendVerificationEmail(createdUser.email, verificationToken);
    }

    // Log audit trail
    const ipAddress = req ? (req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress) : null;
    auditService.log(createdUser.id, "USER_REGISTER", "users", createdUser.id, { role: roleName }, ipAddress);

    // Clean sensitive data
    delete createdUser.password;
    return createdUser;
  }

  /**
   * Authenticates a user. Supports 2FA checking and session initialization.
   */
  async login(email, password, req) {
    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check if 2FA is enabled
    const mfaRecord = await twoFactorRepository.findByUserId(user.id);
    if (mfaRecord && mfaRecord.enabled) {
      // Return a temporary token to proceed with MFA verification
      const tempToken = jwtSignTempToken({ id: user.id, email: user.email });
      return { mfaRequired: true, tempToken };
    }

    return await this.establishSession(user, req);
  }

  /**
   * Helper to set up session and generate tokens after successful authentication / 2FA check
   */
  async establishSession(user, req) {
    // 1. Create a session
    const session = await sessionService.createSession(user.id, req);

    // 2. Fetch user roles & permissions
    const { roles, rolePriorities, permissions } = await userRepository.getUserRolesAndPermissions(user.id);

    // 3. Generate tokens
    const accessToken = tokenService.generateAccessToken(user, roles, permissions, rolePriorities);
    const refreshToken = await tokenService.generateRefreshToken(user.id);

    // Update user's last login
    await userRepository.updateLastLogin(user.id);

    // Dispatch alert email job via background queue
    if (emailQueue) {
      emailQueue.add("send-session-alert", { email: user.email, sessionDetails: session }).catch(() => {
        emailService.sendSessionAlertEmail(user.email, session);
      });
    } else {
      emailService.sendSessionAlertEmail(user.email, session);
    }

    // Log audit trail
    const ipAddress = req ? (req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress) : null;
    auditService.log(user.id, "USER_LOGIN", "users", user.id, { sessionId: session.id }, ipAddress);

    // Remove password
    delete user.password;

    return {
      user: { ...user, roles, permissions },
      sessionId: session.id,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refreshes access token using a valid refresh token
   */
  async refresh(refreshTokenStr) {
    const tokenRecord = await tokenService.verifyRefreshToken(refreshTokenStr);
    const user = await userRepository.findById(tokenRecord.user_id);
    if (!user) {
      throw new UnauthorizedError("User no longer exists");
    }

    const { roles, rolePriorities, permissions } = await userRepository.getUserRolesAndPermissions(user.id);
    const accessToken = tokenService.generateAccessToken(user, roles, permissions, rolePriorities);

    return { accessToken };
  }

  /**
   * Closes a single device session and revokes its corresponding refresh token
   */
  async logout(refreshTokenStr, sessionId) {
    if (refreshTokenStr) {
      await tokenService.revokeRefreshToken(refreshTokenStr);
    }
    if (sessionId) {
      await sessionService.closeSession(sessionId);
    }
  }

  /**
   * Triggers the forgot password flow
   */
  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      // Prevent user enumeration by acting as if email was sent
      return;
    }

    // Invalidate previous active resets
    await passwordResetRepository.invalidateAllForEmail(user.email);

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await passwordResetRepository.create({
      email: user.email,
      token: resetToken,
      expires_at: expiresAt,
    });

    if (emailQueue) {
      emailQueue.add("send-password-reset", { email: user.email, token: resetToken }).catch(() => {
        emailService.sendPasswordResetEmail(user.email, resetToken);
      });
    } else {
      emailService.sendPasswordResetEmail(user.email, resetToken);
    }
  }

  /**
   * Resets password using valid token
   */
  async resetPassword(token, newPassword) {
    const resetRecord = await passwordResetRepository.findByToken(token);
    if (!resetRecord || new Date(resetRecord.expires_at) < new Date()) {
      throw new BadRequestError("Reset token is invalid or has expired");
    }

    const user = await userRepository.findByEmail(resetRecord.email);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Invalidate password reset token
    await passwordResetRepository.markAsUsed(resetRecord.id);

    // Update password
    await userRepository.updatePassword(user.id, passwordHash);

    // Revoke all sessions & refresh tokens for security
    await tokenService.revokeAllUserTokens(user.id);
    await sessionService.closeAllSessions(user.id);
  }

  /**
   * Verifies email with verification token
   */
  async verifyEmail(token) {
    const record = await emailVerificationRepository.findByToken(token);
    if (!record || new Date(record.expires_at) < new Date()) {
      throw new BadRequestError("Verification token is invalid or has expired");
    }

    await emailVerificationRepository.markAsUsed(record.id);
    await userRepository.verifyEmail(record.user_id);
  }

  /**
   * Generates 2FA setup details (secret, backup codes, QR Code URI)
   */
  async enable2FA(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const existingMfa = await twoFactorRepository.findByUserId(userId);
    if (existingMfa && existingMfa.enabled) {
      throw new ConflictError("2FA is already enabled on this account");
    }

    const secret = otpService.generateSecret();
    const backupCodes = otpService.generateBackupCodes();
    const qrURI = otpService.getQRCodeURI(user.email, secret);

    // Save secret (not enabled yet)
    if (existingMfa) {
      await twoFactorRepository.update(userId, { secret, backup_codes: backupCodes, enabled: false });
    } else {
      await twoFactorRepository.create({ user_id: userId, secret, backup_codes: backupCodes, enabled: false });
    }

    return { secret, qrURI, backupCodes };
  }

  /**
   * Verifies OTP token and enables 2FA
   */
  async verifyAndEnable2FA(userId, token) {
    const mfaRecord = await twoFactorRepository.findByUserId(userId);
    if (!mfaRecord) {
      throw new NotFoundError("2FA has not been set up yet. Request setup details first.");
    }

    if (mfaRecord.enabled) {
      throw new ConflictError("2FA is already active");
    }

    const isValid = otpService.verifyTOTP(mfaRecord.secret, token);
    if (!isValid) {
      throw new BadRequestError("Invalid 2FA verification token");
    }

    await twoFactorRepository.update(userId, { enabled: true });
    
    // Parse backup codes to array of strings
    const backupCodes = typeof mfaRecord.backup_codes === "string" 
      ? JSON.parse(mfaRecord.backup_codes) 
      : mfaRecord.backup_codes;

    return { backupCodes };
  }

  /**
   * Verifies login 2FA code
   */
  async login2FA(tempToken, token, req) {
    const payload = jwtVerifyTempToken(tempToken);
    const mfaRecord = await twoFactorRepository.findByUserId(payload.id);
    if (!mfaRecord || !mfaRecord.enabled) {
      throw new BadRequestError("2FA not active for this user");
    }

    // Check TOTP token
    let isValid = otpService.verifyTOTP(mfaRecord.secret, token);

    // Or check backup codes
    if (!isValid) {
      const backupCodes = typeof mfaRecord.backup_codes === "string"
        ? JSON.parse(mfaRecord.backup_codes)
        : mfaRecord.backup_codes;

      const codeIndex = backupCodes.indexOf(token);
      if (codeIndex !== -1) {
        isValid = true;
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await twoFactorRepository.update(payload.id, { backup_codes: backupCodes });
      }
    }

    if (!isValid) {
      throw new UnauthorizedError("Invalid 2FA code");
    }

    const user = await userRepository.findById(payload.id);
    return await this.establishSession(user, req);
  }
}

// Temporary token signature helper for login-mfa handshake
const jwtConfig = require("../config/jwt");
const jwt = require("jsonwebtoken");

function jwtSignTempToken(payload) {
  return jwt.sign(payload, jwtConfig.accessSecret, { expiresIn: "5m" });
}

function jwtVerifyTempToken(token) {
  try {
    return jwt.verify(token, jwtConfig.accessSecret);
  } catch {
    throw new UnauthorizedError("Temporary login token has expired or is invalid");
  }
}

module.exports = new AuthService();
