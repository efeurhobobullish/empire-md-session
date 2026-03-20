const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Base directory
const BASE_DIR = process.cwd();

// Import routes (make sure these export express.Router)
const qrRoutes = require('./qr');
const pairRoutes = require('./pair');

// Fix max listeners warning
require('events').EventEmitter.defaultMaxListeners = 1000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'main.html'));
});

app.get('/qr-page', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'qr.html'));
});

app.get('/pair', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'pair.html'));
});

// API Routes (NO duplication now)
app.use('/qr', qrRoutes);     // → /qr
app.use('/code', pairRoutes); // → /code

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
