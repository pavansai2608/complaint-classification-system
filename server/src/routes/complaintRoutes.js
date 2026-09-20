const express = require('express');
const { create } = require('../controllers/complaintController');
const { createComplaintValidator } = require('../validators/complaintValidators');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.post('/', createComplaintValidator, validate, create);

module.exports = router;
