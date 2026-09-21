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

module.exports = { createComplaint, listComplaintsForCustomer, getComplaintForCustomer };
