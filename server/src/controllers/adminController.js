const { getComplaintSummary, getComplaintAnalytics } = require('../services/complaintService');

async function summary(req, res, next) {
  try {
    res.json(await getComplaintSummary());
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    res.json(await getComplaintAnalytics());
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, analytics };
