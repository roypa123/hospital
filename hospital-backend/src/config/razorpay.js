const Razorpay = require("razorpay");
const logger = require("../shared/logger");

const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_mock_key_id";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_mock_key_secret";

let razorpayInstance = null;

try {
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  logger.info(`Razorpay client initialized. Mode: ${keyId === "rzp_test_mock_key_id" ? "MOCK" : "PRODUCTION"}`);
} catch (error) {
  logger.error("Failed to initialize Razorpay client: ", error);
}

module.exports = {
  razorpayInstance,
  keyId,
  keySecret,
  isMock: keyId === "rzp_test_mock_key_id",
};
