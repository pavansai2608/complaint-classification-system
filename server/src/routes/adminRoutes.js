const express = require('express');
const { summary } = require('../controllers/adminController');

const router = express.Router();

router.get('/summary', summary);

module.exports = router;
