const { validationResult } = require("express-validator");
const { ValidationError } = require("../errors");

/**
 * Middleware wrapper for express-validator chains.
 * Runs validation chains and passes a ValidationError to the next middleware if validation fails.
 * @param {Array} validations Array of express-validator ValidationChains
 */
const validateRequest = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Extract errors and map to standardized validation failure output
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      location: err.location,
    }));

    return next(new ValidationError("Validation failed", formattedErrors));
  };
};

module.exports = validateRequest;
