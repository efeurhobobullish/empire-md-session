const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

const BASE_DIR = process.cwd();

// Import routes
const qrRoutes = require('./qr');
const pairRoutes = require('./pair');

// Fix max listeners warning
require('events').EventEmitter.defaultMaxListeners = 1000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Pages
app.get('/', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'main.html'));
});

app.get('/qr-page', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'qr.html'));
});

app.get('/pair', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'pair.html'));
});

// Routes
app.use('/qr', qrRoutes);
app.use('/code', pairRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
