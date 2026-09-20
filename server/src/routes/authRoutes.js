const express = require('express');
const { register } = require('../controllers/authController');
const { registerValidator } = require('../validators/authValidators');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.post('/register', registerValidator, validate, register);

module.exports = router;
