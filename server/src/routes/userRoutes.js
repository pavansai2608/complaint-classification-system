const express = require('express');
const { me } = require('../controllers/userController');

const router = express.Router();

router.get('/me', me);

module.exports = router;
