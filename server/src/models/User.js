const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Empty for users who only ever sign in with Google.
    passwordHash: { type: String, default: null },
    // No "default: null" here on purpose: a sparse index only skips documents
    // where the field is missing entirely. If every user got an explicit
    // null, Mongo would treat all of them as sharing that one null value and
    // block the second user from ever being created.
    googleId: { type: String },
    role: { type: String, enum: ['customer', 'agent', 'admin'], default: 'customer' },
    isActive: { type: Boolean, default: true },
    // Brute-force protection (FR-08), used once login is built.
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

// email's unique index already comes from "unique: true" above; only
// googleId needs an explicit index (sparse, so users without one are fine).
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

// The password hash must never leave this server, even by accident in a
// response body or a log line, so strip it whenever a document is serialised.
userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
