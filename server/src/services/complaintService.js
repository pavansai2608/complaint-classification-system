const Complaint = require('../models/Complaint');
const { analyzeComplaint } = require('./aiService');
const { ApiError } = require('../utils/ApiError');

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

// No ownership check: the admin works the whole queue.
async function getComplaintById(complaintId) {
  return Complaint.findById(complaintId);
}

// Runs the AI analysis for a complaint that was saved without one (the AI
// service was down, asleep or not deployed yet). Only fills in missing
// analysis - a complaint that already has one is left alone, so an admin's
// corrections are never overwritten. Returns null if it doesn't exist.
async function reanalyzeComplaint(complaintId) {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) return null;
  if (complaint.category && !complaint.analysisPending) {
    throw new ApiError(409, 'ALREADY_ANALYZED', 'This complaint already has an AI analysis.');
  }

  const analysis = await runAnalysis(complaint.description);
  if (analysis.analysisPending) {
    throw new ApiError(503, 'AI_UNAVAILABLE', 'The AI service did not answer. Please try again in a minute.');
  }

  complaint.set(analysis);
  await complaint.save();
  return complaint;
}

// Returns null if the complaint doesn't exist, so the controller can 404
// without the admin being able to tell "missing" from "not yours to see" -
// the admin can act on any complaint, so there's no ownership check here.
async function updateComplaintStatus(complaintId, status, agentId) {
  return Complaint.findByIdAndUpdate(
    complaintId,
    { status, statusUpdatedBy: agentId, statusUpdatedAt: new Date() },
    { returnDocument: 'after' },
  );
}

// Returns null if the complaint doesn't exist. Resolves the complaint as
// part of sending the reply, matching the admin workflow: review, correct
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

async function getComplaintSummary() {
  const rows = await Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const countFor = (status) => rows.find((row) => row._id === status)?.count || 0;

  return {
    total: rows.reduce((sum, row) => sum + row.count, 0),
    open: countFor('Open'),
    inProgress: countFor('In Progress'),
    resolved: countFor('Resolved'),
  };
}

const ANALYTICS_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// Numbers for the admin charts. Takes no input from the request, so there is
// nothing for a caller to tamper with. "now" is a parameter only so tests can
// pin the date.
async function getComplaintAnalytics(now = new Date()) {
  // Midnight UTC on the first day of the window, so today counts as day 14.
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const since = new Date(todayStart - (ANALYTICS_DAYS - 1) * DAY_MS);

  const [categoryRows, priorityRows, dailyRows] = await Promise.all([
    Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Complaint.aggregate([
      { $match: { createdAt: { $gte: since } } },
      // Groups by calendar day in UTC, e.g. "2026-11-05".
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
  ]);

  // A complaint has no category while the AI analysis is still pending.
  const byCategory = categoryRows
    .map((row) => ({ label: row._id || 'Not analysed yet', count: row.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  // Always all four priorities in the same order, with zero for an empty one.
  const byPriority = PRIORITY_ORDER.map((priority) => ({
    label: priority,
    count: priorityRows.find((row) => row._id === priority)?.count || 0,
  }));

  // One entry per day, including days with no complaints, so the chart has
  // no gaps in it.
  const daily = [];
  for (let i = 0; i < ANALYTICS_DAYS; i += 1) {
    const date = new Date(since.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    daily.push({ date, count: dailyRows.find((row) => row._id === date)?.count || 0 });
  }

  return { byCategory, byPriority, daily };
}

module.exports = {
  createComplaint,
  listComplaintsForCustomer,
  getComplaintForCustomer,
  getComplaintById,
  reanalyzeComplaint,
  updateComplaintStatus,
  sendComplaintReply,
  getAgentQueue,
  getComplaintSummary,
  getComplaintAnalytics,
};
