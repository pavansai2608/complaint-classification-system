const { ApiError } = require('../utils/ApiError');

// Must run after authenticate, so req.user is already set.
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'You do not have access to this resource'));
    }
    next();
  };
}

module.exports = { requireRole };
