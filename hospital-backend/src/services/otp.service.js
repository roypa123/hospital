const crypto = require("crypto");

class OTPService {
  /**
   * Helper to decode base32 strings to a Buffer
   */
  _base32Decode(base32) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleaned = base32.replace(/=+$/, "").toUpperCase();
    const length = cleaned.length;
    let bits = 0;
    let value = 0;
    let index = 0;
    const buffer = Buffer.alloc(Math.floor((length * 5) / 8));

    for (let i = 0; i < length; i++) {
      const val = alphabet.indexOf(cleaned[i]);
      if (val === -1) {
        throw new Error("Invalid base32 character in secret");
      }
      value = (value << 5) | val;
      bits += 5;
      if (bits >= 8) {
        buffer[index++] = (value >>> (bits - 8)) & 0xff;
        bits -= 8;
      }
    }
    return buffer;
  }

  /**
   * Generates a 6-digit TOTP code for a given secret and counter
   */
  _generateTOTP(secret, counter) {
    const key = this._base32Decode(secret);
    const buffer = Buffer.alloc(8);
    
    // Write 64-bit counter value
    let temp = counter;
    for (let i = 7; i >= 0; i--) {
      buffer[i] = temp & 0xff;
      temp = temp >> 8;
    }

    const hmac = crypto.createHmac("sha1", key);
    hmac.update(buffer);
    const hmacResult = hmac.digest();

    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const code =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, "0");
  }

  /**
   * Generates a random 32-character base32 secret key for 2FA setup
   */
  generateSecret() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    const randomBytes = crypto.randomBytes(20);
    for (let i = 0; i < 20; i++) {
      secret += chars[randomBytes[i] % 32];
    }
    return secret;
  }

  /**
   * Generates the otpauth URI for QR codes scanning
   */
  getQRCodeURI(email, secret) {
    const label = encodeURIComponent(`HospitalMS:${email}`);
    const issuer = encodeURIComponent("HospitalMS");
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`;
  }

  /**
   * Verifies a 6-digit token against the secret, with a sliding window
   * @param {string} secret Base32 secret string
   * @param {string} token 6-digit string code
   * @param {number} window Time steps window (default 1 step = 30 seconds before/after)
   */
  verifyTOTP(secret, token, window = 1) {
    if (!token || token.length !== 6 || isNaN(token)) {
      return false;
    }
    
    const counter = Math.floor(Date.now() / 30000);
    
    for (let i = -window; i <= window; i++) {
      if (this._generateTOTP(secret, counter + i) === token) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates a list of random backup codes
   */
  generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // 8-character hex code
      codes.push(crypto.randomBytes(4).toString("hex"));
    }
    return codes;
  }
}

module.exports = new OTPService();
