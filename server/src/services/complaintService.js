const Complaint = require('../models/Complaint');

async function createComplaint({ customerId, title, description, orderReference }) {
  return Complaint.create({
    customer: customerId,
    title,
    description,
    orderReference: orderReference || null,
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
