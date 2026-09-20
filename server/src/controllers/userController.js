// authenticate already looked the user up, so there is nothing left to do
// here beyond returning it.
function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { me };
