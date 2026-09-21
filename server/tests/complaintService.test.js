jest.mock('../src/models/Complaint', () => ({ create: jest.fn() }));
jest.mock('../src/services/aiService', () => ({ analyzeComplaint: jest.fn() }));

const Complaint = require('../src/models/Complaint');
const { analyzeComplaint } = require('../src/services/aiService');
const { createComplaint } = require('../src/services/complaintService');

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
