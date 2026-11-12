const express = require('express');
const { summary, analytics } = require('../controllers/adminController');

const router = express.Router();

// Both routes are admin-only: app.js puts authenticate and
// requireRole('admin') in front of this whole router.
router.get('/summary', summary);
router.get('/analytics', analytics);

module.exports = router;
