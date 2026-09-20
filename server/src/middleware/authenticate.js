const { verifyAccessToken } = require('../services/tokenService');
const { getCurrentUser } = require('../services/userService');
const { ApiError } = require('../utils/ApiError');

function unauthorized() {
  return new ApiError(401, 'UNAUTHORIZED', 'Please log in to continue');
}

// Reads the access token from the Authorization header, verifies it, then
// looks the user up so a deactivated account or a role change takes effect
// immediately instead of waiting for the token to expire.
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized());
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = await getCurrentUser(payload.sub);
    next();
  } catch (err) {
    next(unauthorized());
  }
}

module.exports = { authenticate };
