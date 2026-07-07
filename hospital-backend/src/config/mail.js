const nodemailer = require("nodemailer");
const logger = require("../shared/logger");

const config = {
  host: process.env.MAIL_HOST || "smtp.mailtrap.io",
  port: parseInt(process.env.MAIL_PORT || "2525", 10),
  auth: {
    user: process.env.MAIL_USER || null,
    pass: process.env.MAIL_PASS || null,
  },
  from: process.env.MAIL_FROM || "Hospital Management <noreply@hospital.com>",
};

let transporter;

if (config.auth.user && config.auth.pass) {
  transporter = nodemailer.createTransport(config);
} else {
  // Safe mock transporter that logs mail content for local development
  logger.info("Email service running in development MOCK mode. Emails will be written to the server logs.");
  transporter = {
    sendMail: async (mailOptions) => {
      logger.info(`
------ MOCK EMAIL START ------
To: ${mailOptions.to}
Subject: ${mailOptions.subject}
Content:
${mailOptions.text || mailOptions.html}
------- MOCK EMAIL END -------
`);
      return { messageId: `mock-email-id-${Date.now()}` };
    },
  };
}

module.exports = {
  transporter,
  from: config.from,
};
