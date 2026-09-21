const { ApiError } = require('../utils/ApiError');

// A field the client sends that isn't in the route's own list is either a
// mistake or an attempt to smuggle in something the validator never checks
// (e.g. a "role" field on registration). Reject it outright instead of
// silently ignoring it.
function rejectUnknownFields(allowedFields) {
  return function (req, res, next) {
    const unknown = Object.keys(req.body || {}).filter((key) => !allowedFields.includes(key));
    if (unknown.length === 0) return next();

    const details = unknown.map((field) => ({ field, message: 'Unknown field' }));
    next(new ApiError(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields', details));
  };
}

module.exports = { rejectUnknownFields };
