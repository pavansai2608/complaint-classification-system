const express = require('express');
const { register, login, refresh, logout } = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../validators/authValidators');
const { validate } = require('../middleware/validate');
const { loginRateLimiter } = require('../middleware/loginRateLimiter');

const router = express.Router();

router.post('/register', registerValidator, validate, register);
router.post('/login', loginRateLimiter, loginValidator, validate, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;
