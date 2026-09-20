const { createComplaint } = require('../services/complaintService');

async function create(req, res, next) {
  try {
    const { title, description, orderReference } = req.body;
    const complaint = await createComplaint({ customerId: req.user.id, title, description, orderReference });
    res.status(201).json({ complaint });
  } catch (err) {
    next(err);
  }
}

module.exports = { create };
