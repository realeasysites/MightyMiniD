const fs = require('fs');
const path = require('path');
const express = require('express');

const router = express.Router();
const homeFile = path.join(__dirname, '..', 'public', 'index.html');
const homeTemplate = fs.readFileSync(homeFile, 'utf8');

// Social sites need absolute URLs for the share image, so the homepage is
// served with {{SITE_URL}} filled in (from SITE_URL, or the request's own host).
function siteUrl(req) {
  const fromEnv = (process.env.SITE_URL || '').replace(/\/+$/, '');
  return fromEnv || `${req.protocol}://${req.get('host')}`;
}

router.get(['/', '/index.html'], (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(homeTemplate.replace(/\{\{SITE_URL\}\}/g, siteUrl(req)));
});

module.exports = router;
