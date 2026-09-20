const express = require('express');

const router = express.Router();

// Placeholder until the agent workflow epic builds the real priority queue.
router.get('/queue', (req, res) => {
  res.json({ items: [] });
});

module.exports = router;
