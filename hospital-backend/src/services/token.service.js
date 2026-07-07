const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const jwtConfig = require("../config/jwt");
const refreshTokenRepository = require("../repositories/refreshToken.repository");
const { UnauthorizedError } = require("../shared/errors");

class TokenService {
  /**
   * Generates a short-lived Access Token containing user metadata, roles, and permissions
   */
  generateAccessToken(user, roles = [], permissions = []) {
    const payload = {
      id: user.id,
      email: user.email,
      roles,
      permissions,
    };

    return jwt.sign(payload, jwtConfig.accessSecret, {
      expiresIn: jwtConfig.accessExpiresIn,
    });
  }

  /**
   * Generates a secure random Refresh Token, saves it in the database, and returns the token string
   */
  async generateRefreshToken(userId) {
    const rawToken = crypto.randomBytes(40).toString("hex");
    
    // Parse duration string into milliseconds. Default is 7d (7 days)
    const expiryStr = jwtConfig.refreshExpiresIn;
    let durationMs = 7 * 24 * 60 * 60 * 1000; // Fallback 7 days
    const match = expiryStr.match(/^(\d+)([dhm])$/);
    if (match) {
      const val = parseInt(match[1], 10);
      const unit = match[2];
      if (unit === "d") durationMs = val * 24 * 60 * 60 * 1000;
      else if (unit === "h") durationMs = val * 60 * 60 * 1000;
      else if (unit === "m") durationMs = val * 60 * 1000;
    }

    const expiresAt = new Date(Date.now() + durationMs);

    await refreshTokenRepository.create({
      user_id: userId,
      token: rawToken,
      expires_at: expiresAt,
    });

    return rawToken;
  }

  /**
   * Verifies a JWT access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, jwtConfig.accessSecret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new UnauthorizedError("Access token expired");
      }
      throw new UnauthorizedError("Invalid access token");
    }
  }

  /**
   * Verifies an active database-tracked refresh token
   */
  async verifyRefreshToken(tokenStr) {
    const tokenRecord = await refreshTokenRepository.findByToken(tokenStr);
    
    if (!tokenRecord) {
      throw new UnauthorizedError("Refresh token is invalid or revoked");
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      // Auto-revoke expired token
      await refreshTokenRepository.revoke(tokenRecord.id);
      throw new UnauthorizedError("Refresh token expired");
    }

    return tokenRecord;
  }

  /**
   * Revokes a refresh token
   */
  async revokeRefreshToken(tokenStr) {
    const tokenRecord = await refreshTokenRepository.findByToken(tokenStr);
    if (tokenRecord) {
      await refreshTokenRepository.revoke(tokenRecord.id);
    }
  }

  /**
   * Revokes all refresh tokens for a user
   */
  async revokeAllUserTokens(userId) {
    await refreshTokenRepository.revokeAllByUser(userId);
  }
}

module.exports = new TokenService();
