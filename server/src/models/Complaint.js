const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    orderReference: { type: String, trim: true, maxlength: 60, default: null },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
    category: { type: String, default: null },
    confidence: { type: Number, default: null },
    needsReview: { type: Boolean, default: false },
    emotion: {
      label: { type: String, default: null },
      score: { type: Number, default: null },
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    suggestedReply: { type: String, default: null },
    // True when the AI service was unreachable at submit time - the complaint
    // is saved anyway with a safe default priority, and this flags it for retry.
    analysisPending: { type: Boolean, default: false },
    statusUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    statusUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

complaintSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
