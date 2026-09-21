const { createComplaint, listComplaintsForCustomer, getComplaintForCustomer } = require('../services/complaintService');
const { ApiError } = require('../utils/ApiError');

async function create(req, res, next) {
  try {
    const { title, description, orderReference } = req.body;
    const complaint = await createComplaint({ customerId: req.user.id, title, description, orderReference });
    res.status(201).json({ complaint });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const complaints = await listComplaintsForCustomer(req.user.id);
    res.json({ complaints });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const complaint = await getComplaintForCustomer(req.params.id, req.user.id);
    if (!complaint) return next(new ApiError(404, 'NOT_FOUND', 'Complaint not found'));
    res.json({ complaint });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listMine, getOne };
