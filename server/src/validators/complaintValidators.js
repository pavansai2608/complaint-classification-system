const { body, param, query } = require('express-validator');

const VALID_STATUSES = ['Open', 'In Progress', 'Resolved'];

// FR: title 5-120 chars, description 10-2000 chars, order reference optional
// but capped so it can't be used to smuggle in an oversized value.
const createComplaintValidator = [
  body('title').trim().isLength({ min: 5, max: 120 }).withMessage('Title must be 5 to 120 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be 10 to 2000 characters'),
  body('orderReference')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 60 })
    .withMessage('Order reference must be at most 60 characters'),
];

const getComplaintValidator = [param('id').isMongoId().withMessage('Invalid complaint id')];

const getQueueValidator = [
  query('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status filter'),
  query('category').optional().trim().isLength({ max: 60 }).withMessage('Invalid category filter'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

module.exports = { createComplaintValidator, getComplaintValidator, getQueueValidator };
