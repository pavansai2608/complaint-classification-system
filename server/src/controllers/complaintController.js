const {
  createComplaint,
  listComplaintsForCustomer,
  getComplaintForCustomer,
  getComplaintById,
  updateComplaintStatus,
  sendComplaintReply,
} = require('../services/complaintService');
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
    // Customers can only see their own complaint; agents work the whole queue.
    const complaint =
      req.user.role === 'agent'
        ? await getComplaintById(req.params.id)
        : await getComplaintForCustomer(req.params.id, req.user.id);
    if (!complaint) return next(new ApiError(404, 'NOT_FOUND', 'Complaint not found'));
    res.json({ complaint });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const complaint = await updateComplaintStatus(req.params.id, req.body.status, req.user.id);
    if (!complaint) return next(new ApiError(404, 'NOT_FOUND', 'Complaint not found'));
    res.json({ complaint });
  } catch (err) {
    next(err);
  }
}

async function reply(req, res, next) {
  try {
    const { reply: replyText, category, priority } = req.body;
    const complaint = await sendComplaintReply(req.params.id, { reply: replyText, category, priority }, req.user.id);
    if (!complaint) return next(new ApiError(404, 'NOT_FOUND', 'Complaint not found'));
    res.json({ complaint });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listMine, getOne, updateStatus, reply };
