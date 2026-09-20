const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');

// Runs after a route's validator chain. If express-validator found problems,
// turn them into the one error shape every endpoint uses (SDD 7.3) instead
// of letting each route format its own.
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new ApiError(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields', details));
}

module.exports = { validate };
