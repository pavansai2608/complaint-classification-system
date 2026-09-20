const { registerUser } = require('../services/authService');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const user = await registerUser({ name, email, password });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register };
