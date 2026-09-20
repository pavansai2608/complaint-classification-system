require('dotenv').config({ quiet: true });
const { createApp } = require('./app');

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = createApp({ clientOrigin: CLIENT_ORIGIN });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
