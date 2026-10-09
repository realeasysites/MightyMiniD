const nodemailer = require('nodemailer');

let transport = null;
if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}

function formatLead(lead) {
  const lines = [
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email && `Email: ${lead.email}`,
    lead.event_type && `Event: ${lead.event_type}`,
    lead.event_date && `Date: ${lead.event_date}`,
    lead.guests && `Guests: ${lead.guests}`,
    lead.town && `Town: ${lead.town}`,
    lead.notes && `\nDetails:\n${lead.notes}`
  ].filter(Boolean);
  return lines.join('\n');
}

// Never throws: a mail problem must not lose the lead (it is already saved).
async function notifyNewLead(lead) {
  const to = process.env.NOTIFY_EMAIL;
  if (!transport || !to) {
    console.log('[mailer] Email not configured. New lead saved to dashboard:\n' + formatLead(lead));
    return;
  }
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      replyTo: lead.email || undefined,
      subject: `New booking request: ${lead.event_type || 'Event'}${lead.event_date ? ' on ' + lead.event_date : ''} (${lead.name})`,
      text: formatLead(lead) + '\n\nManage it in your dashboard: /admin'
    });
  } catch (err) {
    console.error('[mailer] Could not send lead email:', err.message);
  }
}

module.exports = { notifyNewLead };
