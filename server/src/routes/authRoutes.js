const express = require('express');
const { register, login, google, refresh, logout } = require('../controllers/authController');
const { registerValidator, loginValidator, googleValidator } = require('../validators/authValidators');
const { validate } = require('../middleware/validate');
const { loginRateLimiter } = require('../middleware/loginRateLimiter');

const router = express.Router();

router.post('/register', registerValidator, validate, register);
router.post('/login', loginRateLimiter, loginValidator, validate, login);
router.post('/google', googleValidator, validate, google);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;
