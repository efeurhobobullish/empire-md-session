import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';

import qrRoutes from './qr.js';
import pairRoutes from './pair.js';

const app = express();
const PORT = process.env.PORT || 8000;
const BASE_DIR = process.cwd();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'main.html'));
});

app.get('/qr-page', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'qr.html'));
});

app.get('/pair', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'pair.html'));
});

app.use('/qr', qrRoutes);
app.use('/code', pairRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
