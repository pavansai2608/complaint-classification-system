const bcrypt = require('bcrypt');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');

// FR-02: cost factor 12, matches SDD 11.1.
const BCRYPT_COST = 12;

async function registerUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    return await User.create({ name, email, passwordHash });
  } catch (err) {
    // Two requests can both pass a pre-check and still both try to insert
    // the same email, so the real duplicate check is the database's unique
    // index (error code 11000), not a findOne() done up front.
    if (err.code === 11000) {
      throw new ApiError(409, 'CONFLICT', 'An account with this email already exists');
    }
    throw err;
  }
}

module.exports = { registerUser };
