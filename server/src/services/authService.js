const bcrypt = require('bcrypt');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('./tokenService');
const { verifyGoogleIdToken } = require('./googleAuth');

// FR-02: cost factor 12, matches SDD 11.1.
const BCRYPT_COST = 12;

// FR-08: lock the account for 15 minutes after 5 wrong passwords in a row.
const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function invalidCredentialsError() {
  // Same message and status whether the email doesn't exist, the account
  // has no password (Google-only), or the password is wrong, so a caller
  // can't use this endpoint to find out which accounts exist.
  return new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
}

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

async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash || !user.isActive) {
    throw invalidCredentialsError();
  }

  const isLocked = user.lockUntil && user.lockUntil > new Date();

  // Check the password before saying anything about lock status. Otherwise
  // "locked" vs "wrong password" tells a caller who doesn't know the real
  // password whether this email even has one — the account-locked message
  // should only ever reach someone who already proved they know it.
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (isLocked) {
    if (passwordMatches) {
      throw new ApiError(423, 'ACCOUNT_LOCKED', 'Too many failed attempts. Try again in a few minutes.');
    }
    throw invalidCredentialsError();
  }

  if (!passwordMatches) {
    // $inc is atomic in MongoDB: several wrong-password requests arriving at
    // once still add up correctly instead of all reading the same starting
    // count and racing to overwrite each other's result.
    const updated = await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { failedLogins: 1 } },
      { returnDocument: 'after' },
    );
    if (updated.failedLogins >= MAX_FAILED_LOGINS) {
      await User.updateOne(
        { _id: user._id },
        { $set: { lockUntil: new Date(Date.now() + LOCK_DURATION_MS), failedLogins: 0 } },
      );
    }
    throw invalidCredentialsError();
  }

  if (user.failedLogins !== 0 || user.lockUntil) {
    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lockUntil: null } });
  }

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

function googleAuthError() {
  return new ApiError(401, 'INVALID_GOOGLE_TOKEN', 'Could not verify Google sign-in');
}

async function loginWithGoogle(idToken) {
  let payload;
  try {
    payload = await verifyGoogleIdToken(idToken);
  } catch (err) {
    throw googleAuthError();
  }

  // Only trust an email Google itself has verified as belonging to the
  // person signing in — otherwise anyone could link an account they don't
  // control.
  if (!payload || !payload.email_verified) {
    throw googleAuthError();
  }

  let user = await User.findOne({ googleId: payload.sub });

  if (!user) {
    // Do NOT auto-link to an existing account just because the email
    // matches: anyone could have registered that email with a password
    // they made up, without proving they own the mailbox. Auto-linking
    // would let that attacker's password account silently gain the real
    // owner's identity the moment the real owner signs in with Google.
    const emailTaken = await User.findOne({ email: payload.email });
    if (emailTaken) {
      throw new ApiError(
        409,
        'CONFLICT',
        'An account with this email already exists. Log in with your password instead.',
      );
    }

    try {
      user = await User.create({ name: payload.name || payload.email, email: payload.email, googleId: payload.sub });
    } catch (err) {
      if (err.code === 11000) {
        throw new ApiError(
          409,
          'CONFLICT',
          'An account with this email already exists. Log in with your password instead.',
        );
      }
      throw err;
    }
  }

  if (!user.isActive) {
    throw googleAuthError();
  }

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

async function refreshSession(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Please log in again');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Please log in again');
  }

  return {
    user,
    accessToken: signAccessToken(user),
    // Rotated so a stolen refresh token stops working once the real user
    // refreshes again.
    refreshToken: signRefreshToken(user),
  };
}

module.exports = { registerUser, loginUser, loginWithGoogle, refreshSession };
