require('dotenv').config();

const path = require('path');
const express = require('express');
const { securityHeaders } = require('./lib/security');
const { assertConfig } = require('./lib/config');
require('./db'); // opens the database and applies the schema

assertConfig();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json({ limit: '20kb' }));

app.use('/api', require('./routes/public'));
app.use('/admin', require('./routes/admin'));
app.use(require('./routes/pages'));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Mighty Mini Donuts running on http://localhost:${port}`));
