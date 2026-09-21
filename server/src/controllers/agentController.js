const { matchedData } = require('express-validator');
const { getAgentQueue } = require('../services/complaintService');

async function queue(req, res, next) {
  try {
    // Express 5 makes req.query read-only, so express-validator's sanitizers
    // (like .toInt() on page/limit) can't mutate it in place - matchedData()
    // is where the sanitized values actually end up.
    const { status, category, page, limit } = matchedData(req, { locations: ['query'] });
    const result = await getAgentQueue({ status, category, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { queue };
