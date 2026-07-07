/**
 * Standard HTTP success response formatting utility
 * @param {object} res Express response object
 * @param {string} message Description message of response
 * @param {any} data Response payload
 * @param {number} statusCode HTTP Status code
 */
function sendSuccess(res, message, data = null, statusCode = 200) {
  const payload = {
    success: true,
    message,
  };

  if (data !== null) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  sendSuccess,
};
