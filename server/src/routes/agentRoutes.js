const express = require('express');
const { queue } = require('../controllers/agentController');
const { getQueueValidator } = require('../validators/complaintValidators');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.get('/queue', getQueueValidator, validate, queue);

module.exports = router;
