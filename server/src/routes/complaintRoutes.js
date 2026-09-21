const express = require('express');
const { create, listMine, getOne } = require('../controllers/complaintController');
const { createComplaintValidator, getComplaintValidator } = require('../validators/complaintValidators');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.post('/', createComplaintValidator, validate, create);
router.get('/mine', listMine);
router.get('/:id', getComplaintValidator, validate, getOne);

module.exports = router;
