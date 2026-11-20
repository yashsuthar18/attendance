# Independent Event QR Manager

Next.js app with Supabase storage, organizer mobile/password login, participant QR cards, spreadsheet import and attendance for three meetings.

## Requirements

- Node.js 22 and npm. The minimum supported Node version is 20.9.
- A Supabase project and a Node.js hosting service, such as Vercel.
- HTTPS on the deployed site for camera access and secure session cookies.

## Local development

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`. Fill in your own environment values before using login or database features. Open `http://localhost:3000`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL; available to the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database key |
| `MEMBER_ACCESS_PEPPER` | Server-only HMAC secret, at least 32 characters |
| `MEMBER_SESSION_SECRET` | Separate server-only session secret, at least 32 characters |
| `ORGANIZER_SETUP_KEY` | Optional server-only key for initial password setup |

Generate separate secrets with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep the same pepper and session secret across instances. Changing them invalidates password hashes or sessions. Set the two `NEXT_PUBLIC_` values before building: Next.js embeds them in the browser bundle.

`.env*` files are ignored, with `.env.example` explicitly retained. Never commit real credentials, participant exports or database backups.

## Database setup

For a **new Supabase project**, run all of `sql/schema.sql` in its SQL Editor. It includes the app tables, RLS, service-role grants and both login-rate-limit functions.

For an **existing installation** missing mobile-login support, run `sql/migrate_organizer_mobile_login.sql` after the base schema. It adds the mobile/password columns and organizer login limiter without updating existing accounts or passwords. If table permissions need repair, run `sql/fix_service_role_permissions.sql` after the schema/migration. Use the same Supabase project configured in the environment.

### Initial organizer (new accounts only)

1. Create an Auth user in Supabase Authentication > Users and copy its UUID. The organizer row references this user; the app itself uses mobile/password login.
2. Replace both placeholders in `sql/setup_initial_organizer.sql` and run it once to add the organizer row.
3. Temporarily set a strong `ORGANIZER_SETUP_KEY` on the server.
4. Send a POST to `/api/organizer/setup-password` with JSON containing `setupKey`, the organizer's `mobile`, `password` (at least 8 characters) and optional `displayName`. Use HTTPS on the deployed app. The endpoint stores a bcrypt hash for the existing organizer row.
5. Remove `ORGANIZER_SETUP_KEY` and restart/redeploy to disable password setup. Log in at `/organizer/login` with the configured mobile/password.

Existing organizer accounts do not need to be recreated. The SQL template contains no actual credentials.

## Import and participant login

1. Organizer Dashboard > create/select an event > Import Sheet.
2. Upload a first-row-header `.xlsx` or `.csv`; map Mobile, First Name and the other required/custom fields. `.xls` is unsupported.
3. Review and import. The app processes 150-row batches and skips mobiles already registered for that event.
4. Participant passwords follow **the last four mobile digits + `09`**, including leading zeros: `9876543210` becomes `321009`; `9876500012` becomes `001209`. Imported passwords are stored as HMAC hashes. The credential CSV includes only newly imported members.
5. Share the event's `/join/<slug>` URL. A participant enters their imported mobile and six-digit password, corrects their profile once, confirms and opens their QR card.
6. Reset code reapplies the same mobile-derived password and revokes the participant's previous sessions. QR tokens are generated independently at random.

This password convention is predictable to anyone who knows a mobile number; it is not OTP verification. Login still requires an imported active member and is rate-limited. Keep member records and exports private.

For an interrupted import, review Members before retrying: some rows may already have been saved. Repeat imports skip existing mobiles. Reset affected members if their saved credentials predate the current convention.

## Meetings and attendance

Set the three meeting dates in the dashboard. On the meeting date (Asia/Kolkata), open scanning and save. Open Scanner from that event and select the meeting. The API checks organizer ownership, event membership, profile confirmation, date and duplicate attendance. After the meeting, close scanning and mark it completed; unscanned members then appear as Absent in exports. A copied QR represents the same person, so staff should compare the participant's displayed details when scanning.

## Production deployment

1. Commit the app source, components, libraries, `public/fonts`, SQL, `.env.example`, `package.json` and `package-lock.json`. Include new/untracked files; `.gitignore` does not add files to Git.
2. Configure the five required environment variables in the hosting dashboard. Leave `ORGANIZER_SETUP_KEY` unset after provisioning.
3. Use a Node.js deployment with install command `npm ci`, build command `npm run build` and start command `npm start`. On Vercel, select the Next.js framework preset; it handles the start process.
4. Before deploying, run:

```sh
npm run check
npm test
npm run build
```

5. Apply the database setup to the configured project as needed. Deploy behind HTTPS.
6. On the deployed domain, verify organizer login, event selection, an import, participant confirmation, QR display, scanning on a matching meeting date and CSV export. Local builds do not validate hosting environment values, live database permissions or camera permissions.

The app requires server API routes and cookies; deploy it as a Node.js app, not a static export. No custom `vercel.json` is required for the Next.js preset. Keep regular database backups and test with your expected record count and concurrent scanners before using it for a large event.

## Routes and files

| Path | Purpose |
| --- | --- |
| `/` | Home |
| `/organizer/login` | Organizer mobile/password login |
| `/organizer` | Events, imports, members, meetings and exports |
| `/join/[slug]` | Participant login for an event |
| `/my-card` | Profile confirmation and QR card |
| `/scan?eventId=UUID` | Organizer attendance scanner |
| `/api/organizer/*` | Organizer APIs |
| `/api/member/*` | Participant APIs |
| `public/fonts/` | Local Gujarati font files and license |
| `sql/` | Schema, mobile-login migration and setup templates |
| `examples/members-sample.csv` | Example import format |

The application is independent of Gujarat Forms and does not send SMS, email or bulk messages.
