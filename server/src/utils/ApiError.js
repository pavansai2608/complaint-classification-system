// A thrown error that already knows how it should look as an API response.
// Services throw this for expected problems (bad input, duplicate email);
// the error handler in app.js turns it straight into the standard error shape.
class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

module.exports = { ApiError };
