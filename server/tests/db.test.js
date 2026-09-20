jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: { readyState: 0 },
}));

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

describe('connectDB', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('connects using the given connection string', async () => {
    mongoose.connect.mockResolvedValueOnce();
    await connectDB('mongodb://test-uri/test');
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://test-uri/test');
  });

  it('throws a clear error when no connection string is given', async () => {
    await expect(connectDB()).rejects.toThrow('MONGODB_URI is not set');
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  it('lets a connection failure propagate to the caller', async () => {
    mongoose.connect.mockRejectedValueOnce(new Error('bad host'));
    await expect(connectDB('mongodb://bad-uri')).rejects.toThrow('bad host');
  });
});
