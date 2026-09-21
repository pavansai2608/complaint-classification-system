const express = require('express');
const { register, login, google, refresh, logout } = require('../controllers/authController');
const { registerValidator, loginValidator, googleValidator } = require('../validators/authValidators');
const { validate } = require('../middleware/validate');
const { loginRateLimiter } = require('../middleware/loginRateLimiter');
const { registerRateLimiter } = require('../middleware/registerRateLimiter');
const { rejectUnknownFields } = require('../middleware/rejectUnknownFields');

const router = express.Router();

router.post(
  '/register',
  registerRateLimiter,
  rejectUnknownFields(['name', 'email', 'password']),
  registerValidator,
  validate,
  register,
);
router.post(
  '/login',
  loginRateLimiter,
  rejectUnknownFields(['email', 'password']),
  loginValidator,
  validate,
  login,
);
router.post('/google', rejectUnknownFields(['credential']), googleValidator, validate, google);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;
