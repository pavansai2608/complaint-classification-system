const { body } = require('express-validator');

// FR-01: name 2-60 chars, valid unique email, password >= 8 chars with a
// letter and a number. The unique-email check itself happens in the
// service, against the database, not here.
const registerValidator = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2 to 60 characters'),
  body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
];

// Login only checks that both fields are present; the account/password
// check itself happens in the service, against the database.
const loginValidator = [
  body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = { registerValidator, loginValidator };
