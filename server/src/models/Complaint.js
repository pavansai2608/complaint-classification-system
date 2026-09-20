const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    orderReference: { type: String, trim: true, maxlength: 60, default: null },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  },
  { timestamps: true },
);

complaintSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
