const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');

async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Please log in to continue');
  }
  return user;
}

module.exports = { getCurrentUser };
