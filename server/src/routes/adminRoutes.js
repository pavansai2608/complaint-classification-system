const express = require('express');

const router = express.Router();

// Placeholder until the admin dashboard epic builds the real analytics.
router.get('/summary', (req, res) => {
  res.json({ totalComplaints: 0, openComplaints: 0, resolvedComplaints: 0 });
});

module.exports = router;
