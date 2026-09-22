jest.mock('../src/models/Complaint', () => ({
  create: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findById: jest.fn(),
}));
jest.mock('../src/services/aiService', () => ({ analyzeComplaint: jest.fn() }));

const Complaint = require('../src/models/Complaint');
const { analyzeComplaint } = require('../src/services/aiService');
const {
  createComplaint,
  getAgentQueue,
  updateComplaintStatus,
  sendComplaintReply,
  getComplaintById,
} = require('../src/services/complaintService');

// A minimal stand-in for a mongoose document: plain fields plus a save()
// that resolves to the same (now-mutated) object, mirroring how
// sendComplaintReply mutates the document in place before saving.
function fakeComplaintDoc(fields) {
  const doc = { wasCorrected: false, ...fields };
  doc.save = jest.fn().mockResolvedValue(doc);
  return doc;
}

const baseInput = {
  customerId: 'customer-id',
  title: 'Order arrived damaged',
  description: 'The package arrived with a cracked screen and missing accessories.',
  orderReference: 'ORD-1234',
};

describe('createComplaint', () => {
  afterEach(() => jest.clearAllMocks());

  it('saves the AI analysis results when the AI service responds', async () => {
    analyzeComplaint.mockResolvedValueOnce({
      category: 'product',
      confidence: 0.92,
      needsReview: false,
      emotion: { label: 'negative', score: 0.81 },
      priority: 'High',
      suggestedReply: 'Sorry about the damage, we are on it.',
    });
    Complaint.create.mockResolvedValueOnce({ id: 'complaint-1' });

    await createComplaint(baseInput);

    expect(analyzeComplaint).toHaveBeenCalledWith(baseInput.description);
    expect(Complaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'product',
        confidence: 0.92,
        needsReview: false,
        emotion: { label: 'negative', score: 0.81 },
        priority: 'High',
        suggestedReply: 'Sorry about the damage, we are on it.',
        analysisPending: false,
      }),
    );
  });

  it('still saves the complaint with a default priority when the AI service times out', async () => {
    analyzeComplaint.mockRejectedValueOnce(new Error('The operation was aborted'));
    Complaint.create.mockResolvedValueOnce({ id: 'complaint-2' });

    const result = await createComplaint(baseInput);

    expect(result).toEqual({ id: 'complaint-2' });
    expect(Complaint.create).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'Medium', analysisPending: true }),
    );
  });

  it('still saves the complaint when the AI service errors', async () => {
    analyzeComplaint.mockRejectedValueOnce(new Error('AI service responded with status 500'));
    Complaint.create.mockResolvedValueOnce({ id: 'complaint-3' });

    await createComplaint(baseInput);

    expect(Complaint.create).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'Medium', analysisPending: true }),
    );
  });

  it('never sends unanalyzed fields to the database on failure', async () => {
    analyzeComplaint.mockRejectedValueOnce(new Error('AI service is not configured'));
    Complaint.create.mockResolvedValueOnce({ id: 'complaint-4' });

    await createComplaint(baseInput);

    const savedArgs = Complaint.create.mock.calls[0][0];
    expect(savedArgs.category).toBeUndefined();
    expect(savedArgs.suggestedReply).toBeUndefined();
  });
});

describe('getAgentQueue', () => {
  afterEach(() => jest.clearAllMocks());

  it('defaults to Open complaints, page 1, limit 20', async () => {
    Complaint.aggregate.mockResolvedValueOnce([]);
    Complaint.countDocuments.mockResolvedValueOnce(0);

    const result = await getAgentQueue({});

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    expect(Complaint.countDocuments).toHaveBeenCalledWith({ status: 'Open' });
    const pipeline = Complaint.aggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({ $match: { status: 'Open' } });
  });

  it('sorts by priority rank first, then oldest first', async () => {
    Complaint.aggregate.mockResolvedValueOnce([]);
    Complaint.countDocuments.mockResolvedValueOnce(0);

    await getAgentQueue({});

    const pipeline = Complaint.aggregate.mock.calls[0][0];
    const sortStage = pipeline.find((stage) => stage.$sort);
    expect(sortStage.$sort).toEqual({ priorityRank: 1, createdAt: 1 });
  });

  it('applies status and category filters', async () => {
    Complaint.aggregate.mockResolvedValueOnce([]);
    Complaint.countDocuments.mockResolvedValueOnce(0);

    await getAgentQueue({ status: 'In Progress', category: 'billing' });

    expect(Complaint.countDocuments).toHaveBeenCalledWith({
      status: 'In Progress',
      category: 'billing',
    });
  });

  it('sends an unrecognized or missing priority to the back of the queue, not the front', async () => {
    Complaint.aggregate.mockResolvedValueOnce([]);
    Complaint.countDocuments.mockResolvedValueOnce(0);

    await getAgentQueue({});

    const pipeline = Complaint.aggregate.mock.calls[0][0];
    const addFieldsStage = pipeline.find((stage) => stage.$addFields);
    const rankExpr = addFieldsStage.$addFields.priorityRank.$let.in;
    expect(rankExpr.$cond[1]).toBe(4); // PRIORITY_ORDER.length, i.e. last place
  });

  it('applies paging with skip and limit', async () => {
    Complaint.aggregate.mockResolvedValueOnce([]);
    Complaint.countDocuments.mockResolvedValueOnce(45);

    const result = await getAgentQueue({ page: 3, limit: 10 });

    expect(result).toEqual({ items: [], total: 45, page: 3, limit: 10 });
    const pipeline = Complaint.aggregate.mock.calls[0][0];
    const skipStage = pipeline.find((stage) => stage.$skip !== undefined);
    const limitStage = pipeline.find((stage) => stage.$limit !== undefined);
    expect(skipStage.$skip).toBe(20);
    expect(limitStage.$limit).toBe(10);
  });
});

describe('updateComplaintStatus', () => {
  afterEach(() => jest.clearAllMocks());

  it('records who changed the status and when', async () => {
    Complaint.findByIdAndUpdate.mockResolvedValueOnce({ id: 'complaint-1', status: 'Resolved' });

    await updateComplaintStatus('complaint-1', 'Resolved', 'agent-1');

    expect(Complaint.findByIdAndUpdate).toHaveBeenCalledWith(
      'complaint-1',
      expect.objectContaining({
        status: 'Resolved',
        statusUpdatedBy: 'agent-1',
        statusUpdatedAt: expect.any(Date),
      }),
      { returnDocument: 'after' },
    );
  });

  it('returns null when the complaint does not exist', async () => {
    Complaint.findByIdAndUpdate.mockResolvedValueOnce(null);

    const result = await updateComplaintStatus('missing-id', 'Resolved', 'agent-1');

    expect(result).toBeNull();
  });
});

describe('sendComplaintReply', () => {
  afterEach(() => jest.clearAllMocks());

  it('saves the reply, resolves the complaint, and records who and when', async () => {
    const doc = fakeComplaintDoc({ category: 'billing', priority: 'Medium' });
    Complaint.findById.mockResolvedValueOnce(doc);

    const result = await sendComplaintReply('complaint-1', { reply: 'We refunded the charge.' }, 'agent-1');

    expect(result.agentReply).toBe('We refunded the charge.');
    expect(result.repliedBy).toBe('agent-1');
    expect(result.repliedAt).toBeInstanceOf(Date);
    expect(result.status).toBe('Resolved');
    expect(result.statusUpdatedBy).toBe('agent-1');
    expect(doc.save).toHaveBeenCalled();
  });

  it('leaves wasCorrected false when the agent sends the AI category and priority unchanged', async () => {
    const doc = fakeComplaintDoc({ category: 'billing', priority: 'Medium' });
    Complaint.findById.mockResolvedValueOnce(doc);

    const result = await sendComplaintReply(
      'complaint-1',
      { reply: 'Thanks for your patience.', category: 'billing', priority: 'Medium' },
      'agent-1',
    );

    expect(result.wasCorrected).toBe(false);
    expect(result.originalCategory).toBeUndefined();
  });

  it('flags wasCorrected and records the original values when the agent overrides the category', async () => {
    const doc = fakeComplaintDoc({ category: 'billing', priority: 'Medium' });
    Complaint.findById.mockResolvedValueOnce(doc);

    const result = await sendComplaintReply(
      'complaint-1',
      { reply: 'Correcting the category.', category: 'delivery' },
      'agent-1',
    );

    expect(result.wasCorrected).toBe(true);
    expect(result.originalCategory).toBe('billing');
    expect(result.category).toBe('delivery');
  });

  it('flags wasCorrected and records the original value when the agent overrides the priority', async () => {
    const doc = fakeComplaintDoc({ category: 'billing', priority: 'Medium' });
    Complaint.findById.mockResolvedValueOnce(doc);

    const result = await sendComplaintReply(
      'complaint-1',
      { reply: 'Bumping the priority.', priority: 'Urgent' },
      'agent-1',
    );

    expect(result.wasCorrected).toBe(true);
    expect(result.originalPriority).toBe('Medium');
    expect(result.priority).toBe('Urgent');
  });

  it('returns null when the complaint does not exist', async () => {
    Complaint.findById.mockResolvedValueOnce(null);

    const result = await sendComplaintReply('missing-id', { reply: 'Hi' }, 'agent-1');

    expect(result).toBeNull();
  });
});

describe('getComplaintById', () => {
  afterEach(() => jest.clearAllMocks());

  it('looks up a complaint by id with no ownership filter', async () => {
    Complaint.findById.mockResolvedValueOnce({ id: 'complaint-1' });

    const result = await getComplaintById('complaint-1');

    expect(result).toEqual({ id: 'complaint-1' });
    expect(Complaint.findById).toHaveBeenCalledWith('complaint-1');
  });
});
