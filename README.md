# Independent Event QR Manager (Next.js + Supabase + Vercel)

**Standalone project. Zero connections to Gujarat Forms.** Organizer link, participant login link, QR scanner link. No GF Admin Panel.

## Features in this starter

- Organizer authentication with **Supabase Auth email/password**; *no public organizer signup*. Auth permissions checked on every server API request.
- Create event, get a shareable `/join/<event-slug>` participant link, and automatically create 3 meeting slots.
- Upload `.xlsx` or `.csv` locally in the browser; preview rows; map any column to known fields or dynamic custom fields; ignore unwanted columns.
- Import 5,000+ people in **150-row batches**, with duplicate mobile detection per event and a unique **random 16-character access code** for each new member.
- Download **new access codes CSV immediately**. Code hashes are stored; plaintext codes aren't. Organizer can reset a member's code if lost (invalidates previous member sessions).
- Member login with event slug + mobile + code, with a DB-backed per-mobile rate limit. **No SMS OTP** in this free MVP.
- First-login profile correction and one-time confirmation; missing fields visibly indicated.
- Download printable ID card with an individual QR code. Same QR can be scanned at each of the 3 meetings.
- Organizer QR scanner using phone camera. Only an authorized organizer can record attendance. Date check (Asia/Kolkata), manually open/close meeting, and **one attendance record per member per meeting**.
- Export updated records, all selected custom fields, meeting Present/Pending/Absent statuses and scan timestamps as UTF-8 `.csv` (opens in Excel).
- Database Row Level Security enabled. Supabase service-role secret stays on server.

## 1 — Requirements

- Node.js 20.9+ (Node 22 recommended), npm, Git account
- One independent Supabase project (Postgres database)
- One separate Vercel project; use **Hobby only for personal, non-commercial use**
- No need to purchase SMS service for this starter.

## 2 — Supabase setup (one-time)

1. Create a Supabase project, and wait for the database to start.
2. Supabase → **SQL Editor** → paste and run **`sql/schema.sql`**.
3. Supabase → **Authentication → Users** → create the initial organizer email/password user manually (use the option to create a user; don't put organizer sign-up on the public site). Copy the `User UID`.
4. SQL Editor run:

```sql
insert into public.organizers(id, display_name)
values ('PASTE_AUTH_USER_UID_HERE', 'Main Organizer');
```

5. Supabase → **Project Settings → API**: copy Project URL, `anon` (publishable) key, and `service_role` secret. Do not confuse `anon` with `service_role`.
6. Never paste `service_role` or the access pepper into frontend code, Vercel `NEXT_PUBLIC_` variables, public GitHub repos or screenshots.

**Note:** If Supabase Auth email verification is enabled for the manually created user, ensure the organizer's email is confirmed before attempting login.

## 3 — Local development

```bash
npm install
cp .env.example .env.local
# Edit .env.local and supply all five environment variables.
# Make your 2 independent high-entropy secrets with:
openssl rand -hex 32
openssl rand -hex 32
npm run dev
```

Open `http://localhost:3000/organizer/login` with the organizer's Supabase email/password.

Next.js 16 requires a modern Node.js version. `.env.local` stays private and is in `.gitignore`.

## 4 — Import workflow

1. Organizer → Create Event → Import Sheet.
2. Upload your first-row-header `.xlsx` or `.csv` file.
3. Map **Mobile** and **First Name**; map other fields or choose **Custom field** for arbitrary headers.
4. Review column preview → Start Import. The client sends 150 rows at a time; show progress; no large server uploads.
5. **Download the new-access-codes CSV immediately** and keep it private. Only newly created members receive codes in that file; repeat imports skip mobiles already registered for the same event.
6. Distribute each person's *own* mobile + secret access code privately, along with event's participant URL.
7. For a missing code, Organizer → Members → Reset code. This revokes the member's existing login session. Access codes cannot be read from the database later.

Excel mobile-number and PIN columns should be formatted as **Text** before exporting. `.xls` is not supported; resave as `.xlsx` first.

### IMPORTANT: interrupted imports

A failed network request can leave some rows already imported even when the response is lost. Their plaintext initial codes cannot be recovered. Use **Reset code** for affected members. Keep the downloaded credential CSV secure. The production follow-up should add resumable import jobs and a securely managed credential-delivery method.

## 5 — Participant workflow

1. Open `https://YOUR_DOMAIN/join/EVENT-SLUG`.
2. Enter 10-digit mobile + assigned random access code.
3. View imported fields, fill missing values, correct data, and **Confirm & Save** once.
4. Open My Card to display / print / save ID Card as PDF with the QR.
5. Same QR can be scanned for each meeting; only an organizer scanner with the matching event and meeting may mark a person present.

## 6 — 3 meetings / QR attendance

1. Organizer → 3 Meetings: set Meeting 1, 2 and 3 dates.
2. On meeting day, tick **Open for scanning** and **Save**.
3. Organizer → Open Scanner; select the meeting and allow camera permissions.
4. Scan participant's QR. The API checks event, active meeting, local date, membership, profile confirmation and duplicate attendance.
5. After the meeting, untick **Open for scanning**, tick **Completed**, Save. Only then do unscanned members become **Absent** in export; others remain **Pending**.
6. Organizer → Export → Download attendance `.csv`, open in Excel.

**Security:** Anyone with a photographed QR can impersonate that card if they physically reach a staff scanner. Staff should compare name/photo or a second factor at the door for sensitive/high-value events. This version does not include a face photo.

## 7 — Deploy to Vercel

1. Push this project to a **new private GitHub repository** (separate from GF).
2. Vercel → Add New Project → Import that repo → framework **Next.js**.
3. Add all variables from `.env.example` in Vercel → Project → Settings → Environment Variables, using real credentials. Redeploy after adding them.
4. Deploy. Use your `*.vercel.app` URL or a custom domain.
5. Supabase → Authentication → URL Configuration: set your site URL to the deployed project URL. If using Auth redirect URLs later, allowlist the appropriate origin.
6. Test using sample sheet → member login → confirmation → QR scan → export on matching date.

### Current free-tier cautions

- **Vercel Hobby is restricted to personal, non-commercial projects.** Paid event-management service or commercial work may require a paid hosting plan.
- Supabase Free currently includes **500 MB database storage**, subject to free-tier quotas; inactive free projects may pause. See Supabase pricing for updated conditions.
- Real production for 5,000+ users needs tests with 5,000+ sample records, backup/export strategy, scanner/device concurrency testing, and monitoring.
- Camera QR scan requires HTTPS (Vercel provides it).

## 8 — Data and privacy

- Store a phone number and participant details only with necessary notice/consent. Limit access to organizer(s).
- Credentials CSV is highly sensitive. Do not send it to an event-wide WhatsApp group.
- No public server signup. Organizer's Supabase Auth email login is independent of member mobile login.
- Supabase public (anon) key is permitted in frontend; **service role is never permitted there**.
- Retain only the personal information required, and delete/import backups when no longer needed.
- Add production CAPTCHA/WAF protection, audit logs, data-retention policy, encrypted backups and a secure invitation delivery channel before a high-stakes event.

## 9 — Next development milestones

- Participant OTP verification (requires SMS provider and per-message cost) or password rotation.
- Separate staff accounts and restricted scanning permissions (present starter lets only the owner organizer scan).
- Resumable multi-worker imports, full backup/recovery, separate audit log for attendance edits.
- Real PDF card download with branded template and member photo.
- `.xlsx` export instead of CSV, and dashboard charts.
- Language localization and a stronger rate-limit/WAF strategy.

## Project routes

```text
/                      Public landing
/organizer/login       Organizer email+password login
/organizer             Organizer link (create event/import/meetings/members/export)
/join/[slug]           Member mobile+access-code login
/my-card               First-time confirmation + printable QR card
/scan?eventId=UUID     Authorized organizer camera QR scanning
/api/organizer/*       Authorized organizer API
/api/member/*          Member session/profile API
sql/schema.sql         Complete Supabase schema and RLS
examples/members-sample.csv
```

## Quick database notes

- `organizers`: allowed organizer Auth user IDs.
- `events`: name, slug, owner, timezone.
- `event_members`: unique `(event_id, mobile)`, salted? **No salt required here** because credentials are 96-bit cryptographically random codes and hash uses a server-only HMAC pepper; do **not** reuse this scheme for user-chosen passwords. If user-entered passwords are added, use Argon2id/bcrypt with salt.
- `meetings`: each event gets 3 numbered meetings with dates/open/completed status.
- `attendance`: unique `(meeting_id, member_id)` and a cross-event integrity trigger.
- `import_batches`: mapped sheet metadata and progress.
- `member_login_attempts`: 15-minute login throttling.

**No paid SMS, email sending, bulk personal messaging, external CRM, or GF database connection is included.**
"# attendance" 
