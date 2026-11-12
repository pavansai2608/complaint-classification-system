const { getComplaintSummary } = require('../services/complaintService');

async function summary(req, res, next) {
  try {
    res.json(await getComplaintSummary());
  } catch (err) {
    next(err);
  }
}

module.exports = { summary };
