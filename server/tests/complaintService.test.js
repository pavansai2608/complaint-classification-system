jest.mock('../src/models/Complaint', () => ({
  create: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../src/services/aiService', () => ({ analyzeComplaint: jest.fn() }));

const Complaint = require('../src/models/Complaint');
const { analyzeComplaint } = require('../src/services/aiService');
const { createComplaint, getAgentQueue, updateComplaintStatus } = require('../src/services/complaintService');

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
      { new: true },
    );
  });

  it('returns null when the complaint does not exist', async () => {
    Complaint.findByIdAndUpdate.mockResolvedValueOnce(null);

    const result = await updateComplaintStatus('missing-id', 'Resolved', 'agent-1');

    expect(result).toBeNull();
  });
});
