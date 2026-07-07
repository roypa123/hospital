const { transporter, from } = require("../config/mail");
const logger = require("../shared/logger");

class EmailService {
  /**
   * Sends email verification token/link
   */
  async sendVerificationEmail(email, token) {
    const verificationLink = `http://localhost:3000/api/auth/verify-email?token=${token}`;
    const mailOptions = {
      to: email,
      from,
      subject: "Verify Your Email - Hospital Management System",
      text: `Hello,\n\nPlease verify your email by clicking the link below or entering the verification token.\n\nLink: ${verificationLink}\n\nToken: ${token}\n\nThis token will expire in 24 hours.`,
      html: `
        <h3>Welcome to the Hospital Management System</h3>
        <p>Please verify your email by clicking the link below or using the token provided.</p>
        <p><a href="${verificationLink}">Verify Email Address</a></p>
        <p><strong>Verification Token:</strong> ${token}</p>
        <p>This token is valid for 24 hours.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Verification email successfully triggered for: ${email}`);
    } catch (error) {
      logger.error(`Failed to send verification email to ${email}: `, error);
    }
  }

  /**
   * Sends password reset token/link
   */
  async sendPasswordResetEmail(email, token) {
    const resetLink = `http://localhost:3000/api/auth/reset-password?token=${token}`;
    const mailOptions = {
      to: email,
      from,
      subject: "Password Reset Request - Hospital Management System",
      text: `Hello,\n\nYou requested a password reset. Click the link below or enter the token to reset your password.\n\nLink: ${resetLink}\n\nToken: ${token}\n\nIf you did not request this, please ignore this email.`,
      html: `
        <h3>Password Reset Request</h3>
        <p>You are receiving this email because a password reset request was initiated for your account.</p>
        <p>Please click the link below or copy the token to reset your password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p><strong>Reset Token:</strong> ${token}</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Password reset email successfully triggered for: ${email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}: `, error);
    }
  }

  /**
   * Sends login notification email
   */
  async sendSessionAlertEmail(email, sessionDetails) {
    const mailOptions = {
      to: email,
      from,
      subject: "New Login Notification - Hospital Management System",
      text: `Hello,\n\nA new login was detected on your account.\n\nDevice: ${sessionDetails.device_name}\nBrowser: ${sessionDetails.browser}\nOS: ${sessionDetails.os}\nIP: ${sessionDetails.ip_address}\nTime: ${new Date(sessionDetails.login_at).toLocaleString()}`,
      html: `
        <h3>New Login Detected</h3>
        <p>We noticed a new login to your Hospital Management System account.</p>
        <ul>
          <li><strong>Device:</strong> ${sessionDetails.device_name}</li>
          <li><strong>Browser:</strong> ${sessionDetails.browser}</li>
          <li><strong>Operating System:</strong> ${sessionDetails.os}</li>
          <li><strong>IP Address:</strong> ${sessionDetails.ip_address}</li>
          <li><strong>Time:</strong> ${new Date(sessionDetails.login_at).toLocaleString()}</li>
        </ul>
        <p>If this was not you, please secure your account immediately by changing your password or ending active sessions.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Login alert email successfully triggered for: ${email}`);
    } catch (error) {
      logger.error(`Failed to send login alert email to ${email}: `, error);
    }
  }
}

module.exports = new EmailService();
