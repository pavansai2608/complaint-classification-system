const { OAuth2Client } = require('google-auth-library');

// Verifies the token came from Google, was issued for our app, and hasn't
// expired. Throws if any of that isn't true.
async function verifyGoogleIdToken(idToken) {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    // verifyIdToken only checks the "aud" claim when an audience is given —
    // with none, it would accept a token meant for a completely different
    // app. Fail closed instead.
    throw new Error('GOOGLE_CLIENT_ID is not set');
  }

  const client = new OAuth2Client(audience);
  const ticket = await client.verifyIdToken({ idToken, audience });
  return ticket.getPayload();
}

module.exports = { verifyGoogleIdToken };
