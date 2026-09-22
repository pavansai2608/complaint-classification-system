const Complaint = require('../models/Complaint');
const { analyzeComplaint } = require('./aiService');

// Never lets an AI service outage lose a complaint: on any failure (down,
// slow, misconfigured) the complaint is still saved, just with a safe
// default priority and a flag so it can be retried later.
async function runAnalysis(description) {
  try {
    const result = await analyzeComplaint(description);
    return {
      category: result.category,
      confidence: result.confidence,
      needsReview: result.needsReview,
      emotion: result.emotion,
      priority: result.priority,
      suggestedReply: result.suggestedReply,
      analysisPending: false,
    };
  } catch (err) {
    return { priority: 'Medium', analysisPending: true };
  }
}

async function createComplaint({ customerId, title, description, orderReference }) {
  const analysis = await runAnalysis(description);

  return Complaint.create({
    customer: customerId,
    title,
    description,
    orderReference: orderReference || null,
    ...analysis,
  });
}

async function listComplaintsForCustomer(customerId) {
  return Complaint.find({ customer: customerId }).sort({ createdAt: -1 });
}

// Returns null if the complaint doesn't exist or belongs to someone else,
// so a caller can't tell the two cases apart from the response.
async function getComplaintForCustomer(complaintId, customerId) {
  return Complaint.findOne({ _id: complaintId, customer: customerId });
}

// No ownership check: agents work the whole queue, not just their own complaints.
async function getComplaintById(complaintId) {
  return Complaint.findById(complaintId);
}

// Returns null if the complaint doesn't exist, so the controller can 404
// without an agent being able to tell "missing" from "not yours to see" -
// agents can act on any complaint, so there's no ownership check here.
async function updateComplaintStatus(complaintId, status, agentId) {
  return Complaint.findByIdAndUpdate(
    complaintId,
    { status, statusUpdatedBy: agentId, statusUpdatedAt: new Date() },
    { returnDocument: 'after' },
  );
}

// Returns null if the complaint doesn't exist. Resolves the complaint as
// part of sending the reply, matching the agent workflow: review, correct
// if needed, send, done - one action, not a separate "mark resolved" step.
async function sendComplaintReply(complaintId, { reply, category, priority }, agentId) {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) return null;

  const categoryChanged = category && category !== complaint.category;
  const priorityChanged = priority && priority !== complaint.priority;

  complaint.agentReply = reply;
  complaint.repliedBy = agentId;
  complaint.repliedAt = new Date();
  complaint.status = 'Resolved';
  complaint.statusUpdatedBy = agentId;
  complaint.statusUpdatedAt = complaint.repliedAt;

  if (categoryChanged || priorityChanged) {
    complaint.wasCorrected = true;
    if (categoryChanged) {
      complaint.originalCategory = complaint.category;
      complaint.category = category;
    }
    if (priorityChanged) {
      complaint.originalPriority = complaint.priority;
      complaint.priority = priority;
    }
  }

  return complaint.save();
}

// Priority is stored as a string enum, so it can't be sorted alphabetically -
// this fixed list gives each value a rank (0 = highest) for the sort below.
const PRIORITY_ORDER = ['Urgent', 'High', 'Medium', 'Low'];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

async function getAgentQueue({ status, category, page, limit } = {}) {
  const match = { status: status || 'Open' };
  if (category) match.category = category;

  const currentPage = page || DEFAULT_PAGE;
  const pageSize = limit || DEFAULT_LIMIT;
  const skip = (currentPage - 1) * pageSize;

  const [items, total] = await Promise.all([
    Complaint.aggregate([
      { $match: match },
      // $indexOfArray returns -1 for a value it doesn't recognize (e.g. an
      // older complaint saved before priority existed), which would sort
      // ahead of Urgent (rank 0) if used as-is. Send unranked priorities to
      // the back of the queue instead, so a data gap never jumps the line.
      {
        $addFields: {
          priorityRank: {
            $let: {
              vars: { idx: { $indexOfArray: [PRIORITY_ORDER, '$priority'] } },
              in: { $cond: [{ $eq: ['$$idx', -1] }, PRIORITY_ORDER.length, '$$idx'] },
            },
          },
        },
      },
      { $sort: { priorityRank: 1, createdAt: 1 } },
      { $skip: skip },
      { $limit: pageSize },
      { $project: { priorityRank: 0 } },
    ]),
    Complaint.countDocuments(match),
  ]);

  return { items, total, page: currentPage, limit: pageSize };
}

module.exports = {
  createComplaint,
  listComplaintsForCustomer,
  getComplaintForCustomer,
  getComplaintById,
  updateComplaintStatus,
  sendComplaintReply,
  getAgentQueue,
};
