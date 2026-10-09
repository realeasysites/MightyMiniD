// Fails fast on missing or unsafe settings so the admin dashboard is never left open.
function assertConfig() {
  const problems = [];
  const pw = process.env.ADMIN_PASSWORD || '';
  const secret = process.env.SESSION_SECRET || '';

  if (pw.length < 10 || pw === 'change-me-to-something-long') {
    problems.push('ADMIN_PASSWORD must be set to at least 10 characters.');
  }
  if (secret.length < 32 || secret === 'paste-a-long-random-string-here') {
    problems.push('SESSION_SECRET must be set to a random string of at least 32 characters.');
  }
  if (!process.env.NOTIFY_EMAIL) {
    console.warn('[config] NOTIFY_EMAIL is not set. New leads will only appear in the dashboard.');
  }

  if (problems.length) {
    console.error('[config] Fix these in your .env file before starting:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
}

module.exports = { assertConfig };
