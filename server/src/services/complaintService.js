const Complaint = require('../models/Complaint');

async function createComplaint({ customerId, title, description, orderReference }) {
  return Complaint.create({
    customer: customerId,
    title,
    description,
    orderReference: orderReference || null,
  });
}

module.exports = { createComplaint };
