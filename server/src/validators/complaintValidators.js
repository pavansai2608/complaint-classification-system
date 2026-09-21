const { body, param } = require('express-validator');

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

module.exports = { createComplaintValidator, getComplaintValidator };
