const sessionRepository = require("../repositories/session.repository");

class SessionService {
  /**
   * Helper to parse user-agent string into browser and OS info
   */
  _parseUserAgent(userAgentString = "") {
    let browser = "Unknown Browser";
    let os = "Unknown OS";
    let deviceName = "Desktop/Server";

    const ua = userAgentString.toLowerCase();

    // Parse Browser
    if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("chrome") && !ua.includes("chromium")) browser = "Chrome";
    else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
    else if (ua.includes("edge")) browser = "Edge";
    else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";
    else if (ua.includes("chromium")) browser = "Chromium";

    // Parse OS
    if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
    else if (ua.includes("iphone") || ua.includes("ipad")) {
      os = "iOS";
      deviceName = ua.includes("iphone") ? "iPhone" : "iPad";
    } else if (ua.includes("android")) {
      os = "Android";
      deviceName = "Mobile Device";
    } else if (ua.includes("linux")) os = "Linux";

    return { browser, os, deviceName };
  }

  /**
   * Creates a user login session
   */
  async createSession(userId, req) {
    const userAgentStr = req.headers["user-agent"] || "";
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    
    const { browser, os, deviceName } = this._parseUserAgent(userAgentStr);

    return await sessionRepository.create({
      user_id: userId,
      device_name: deviceName,
      browser,
      os,
      ip_address: ipAddress,
      user_agent: userAgentStr,
      is_active: true,
    });
  }

  /**
   * Fetches active sessions for a user
   */
  async getActiveSessions(userId) {
    return await sessionRepository.findActiveByUser(userId);
  }

  /**
   * Checks the number of active sessions for a user
   */
  async getActiveCount(userId) {
    return await sessionRepository.countActive(userId);
  }

  /**
   * Updates last activity timestamp
   */
  async touchSession(sessionId) {
    return await sessionRepository.updateActivity(sessionId);
  }

  /**
   * Closes a specific session
   */
  async closeSession(sessionId) {
    return await sessionRepository.close(sessionId);
  }

  /**
   * Closes all active sessions for a user (forces logout on all devices)
   */
  async closeAllSessions(userId) {
    return await sessionRepository.closeAll(userId);
  }
}

module.exports = new SessionService();
