// Creates an admin account, or turns an existing account into a working
// admin. Admins can't sign up through the website, and an account typed
// straight into the database can't log in (the password must be a bcrypt
// hash and the email must be stored the way the login form normalises it).
//
// Local:  ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node src/scripts/createAdmin.js
// Server: kubectl exec -it deploy/server -- env ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node src/scripts/createAdmin.js
require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { isEmail, normalizeEmail } = require('validator');
const { connectDB } = require('../config/db');
const User = require('../models/User');

const BCRYPT_COST = 12;

// Same rules the register form enforces (validators/authValidators.js).
function findInputProblems({ name, email, password }) {
  const problems = [];
  const trimmedName = (name || '').trim();
  if (trimmedName.length < 2 || trimmedName.length > 60) {
    problems.push('ADMIN_NAME must be 2 to 60 characters');
  }
  if (!email || !isEmail(email.trim())) {
    problems.push('ADMIN_EMAIL must be a valid email address');
  }
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    problems.push('ADMIN_PASSWORD must be at least 8 characters, with a letter and a number');
  }
  return problems;
}

async function createOrUpdateAdmin({ name, email, password }) {
  const problems = findInputProblems({ name, email, password });
  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }

  // The login route runs normalizeEmail() on what the user types (for Gmail
  // it lowercases and drops dots), so the stored email must match that form
  // or the admin could never log in.
  const loginEmail = normalizeEmail(email.trim());
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  return User.findOneAndUpdate(
    { email: loginEmail },
    {
      $set: {
        name: name.trim(),
        passwordHash,
        role: 'admin',
        isActive: true,
        failedLogins: 0,
        lockUntil: null,
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
  );
}

async function main() {
  try {
    await connectDB(process.env.MONGODB_URI);
    const admin = await createOrUpdateAdmin({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    console.log(`Admin account ready. Log in with: ${admin.email}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createOrUpdateAdmin };
