const express = require('express');
const cors = require('cors');
const path = require('path');
const { createApiRouter } = require('./api.cjs');
const { getSystemHardwareId } = require('./licensing.cjs');

const app = express();
const PORT = process.env.PORT || 4200;

app.use(cors());
app.use(express.json());

async function start() {
  // Mount the API router
  app.use('/api', await createApiRouter({
    licenseFile: path.join(__dirname, 'license.dat'),
    dataFile: path.join(__dirname, 'data.json'),
    dbFile: path.join(__dirname, 'data.db')
  }));

  const server = app.listen(PORT, () => {
    console.log(`Zia-Billing Backend running on http://localhost:${PORT}`);
    console.log(`Machine System ID: ${getSystemHardwareId().systemId}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use; another backend or Electron embedded server is running.`);
    } else {
      console.error('Server error:', err);
    }
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
