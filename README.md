# Mighty Mini Donuts website

Public website, booking-request system and owner dashboard for Mighty Mini Donuts (Fryeburg, Maine).

- **Public site**: `/`. Menu, photos, upcoming stops, booking form, Facebook links.
- **Owner dashboard**: `/admin`. Booking requests with status tracking (New, Contacted, Quoted, Booked, Lost), private notes, call/text buttons, spreadsheet export, and a schedule editor that updates the "Where we'll be" list on the site.

## Run it

Requires **Node 20** (pinned in `.node-version` and `package.json`; `better-sqlite3` has no prebuilt binary for newer Node releases).

```bash
cp .env.example .env     # then fill in ADMIN_PASSWORD, SESSION_SECRET, NOTIFY_EMAIL, SMTP_*
npm install
npm start                # http://localhost:3000
```

Generate a `SESSION_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The server refuses to start if `ADMIN_PASSWORD` or `SESSION_SECRET` is missing or left at the example value.

## Deploying

**Render (recommended):** push this folder to GitHub, then in Render choose **New > Blueprint** and pick the repo. `render.yaml` sets up the web service, a 1 GB persistent disk for the database, and the environment variables. Render will ask you for `ADMIN_PASSWORD`, `SITE_URL` and the `SMTP_*` values; `SESSION_SECRET` is generated for you. The disk needs a paid instance (Starter); on the free plan every booking request is erased on each deploy or restart.

Any other Node host works too (Railway, a VPS). Two things matter:

1. Set the `.env` values as environment variables on the host.
2. Point `DB_PATH` at a **persistent disk**. On hosts with temporary file systems the SQLite file (and every lead) is wiped on redeploy otherwise.

## Email notifications

New booking requests are emailed to `NOTIFY_EMAIL` through any SMTP provider (Gmail app password, Postmark, SendGrid, etc.). If SMTP isn't set up, leads are still saved and shown in the dashboard; email is a convenience, never the only copy.

## Updating content

- **Logo**: `public/images/logo.webp` + `logo.png` (transparent cutout used as the hero headline). `og-image.jpg` is the logo card shown when the link is shared on Facebook or by text; `mascot.png`, `favicon-48.png` and `apple-touch-icon.png` are the caped donut on its own.
- **Photos**: `public/images/` (`serving.jpg`, `cinnamon-sugar.jpg`, `fair-booth.jpg`, `concert-bucket.jpg`, `chocolate-sprinkles.jpg`, `glazed-bucket.jpg`, `donut-delight.jpg`, `trailer.jpg`).
- **Menu and prices**: the "Pick your superpower" section in `public/index.html`.
- **Share links**: set `SITE_URL` to the live address so Facebook and text previews show the logo card.
- **Facebook reel**: paste a reel link into `REEL_URL` at the top of `public/js/site.js` and the "See us in action" section appears.
- **Schedule**: no code needed. Log in at `/admin`, open **Schedule**, add a stop. Past stops hide themselves.

## Project layout

```
server.js          thin entry point
db/                SQLite connection + schema
lib/               auth, mailer, validation, config checks, security headers
routes/            public API (/api/quote, /api/stops) and admin API (/admin/*)
public/            the website, CSS/JS, images, and the admin dashboard pages
```
