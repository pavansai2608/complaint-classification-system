const express = require('express');
const { create, listMine, getOne, updateStatus, reply } = require('../controllers/complaintController');
const {
  createComplaintValidator,
  getComplaintValidator,
  updateStatusValidator,
  replyValidator,
} = require('../validators/complaintValidators');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.post('/', requireRole('customer'), createComplaintValidator, validate, create);
router.get('/mine', requireRole('customer'), listMine);
router.patch('/:id/status', requireRole('agent'), updateStatusValidator, validate, updateStatus);
router.post('/:id/reply', requireRole('agent'), replyValidator, validate, reply);
router.get('/:id', requireRole('customer', 'agent'), getComplaintValidator, validate, getOne);

module.exports = router;
