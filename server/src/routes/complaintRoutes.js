const express = require('express');
const { create, listMine, getOne, updateStatus, reply, analyze } = require('../controllers/complaintController');
const {
  createComplaintValidator,
  getComplaintValidator,
  updateStatusValidator,
  replyValidator,
} = require('../validators/complaintValidators');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/requireRole');
const { rejectUnknownFields } = require('../middleware/rejectUnknownFields');

const router = express.Router();

router.post(
  '/',
  requireRole('customer'),
  rejectUnknownFields(['title', 'description', 'orderReference']),
  createComplaintValidator,
  validate,
  create,
);
router.get('/mine', requireRole('customer'), listMine);
router.patch(
  '/:id/status',
  requireRole('admin'),
  rejectUnknownFields(['status']),
  updateStatusValidator,
  validate,
  updateStatus,
);
router.post(
  '/:id/reply',
  requireRole('admin'),
  rejectUnknownFields(['reply', 'category', 'priority']),
  replyValidator,
  validate,
  reply,
);
// Runs the AI analysis for a complaint saved without one. No body is accepted.
router.post(
  '/:id/analyze',
  requireRole('admin'),
  rejectUnknownFields([]),
  getComplaintValidator,
  validate,
  analyze,
);
router.get('/:id', requireRole('customer', 'admin'), getComplaintValidator, validate, getOne);

module.exports = router;
