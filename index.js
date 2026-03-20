const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

require('events').EventEmitter.defaultMaxListeners = 1000;

const startTime = Date.now();

app.set('json spaces', 2);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const qrRouter = require('./qr');
const pairRouter = require('./pair');

app.use('/qr', qrRouter);
app.use('/code', pairRouter);

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Empire MD API' });
});

function formatUptime(ms) {
  let seconds = Math.floor(ms / 1000);

  const days = Math.floor(seconds / 86400);
  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts = [];

  if (days) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds || parts.length === 0)
    parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);

  return parts.join(' ');
}

app.get('/uptime', (req, res) => {
  const uptime = formatUptime(Date.now() - startTime);
  res.json({ uptime });
});

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});

module.exports = app;
