# MASTER PROMPT FOR CODEX — INDEPENDENT EVENT QR ATTENDANCE SYSTEM

You are my senior full-stack engineer, database architect, security reviewer, QA engineer, and deployment engineer. I already have an existing **Next.js JavaScript + Supabase** starter project named **`independent-event-qr`**. I will attach the project ZIP or open its folder in your workspace. **Continue and improve the existing repository; do not recreate or replace it unnecessarily.** Read `README.md`, `package.json`, `sql/schema.sql`, and all existing app/API/component/lib files before modifying anything.

## Mission and non-negotiable rules

Build a complete, secure, responsive, production-oriented **Independent Event Registration, Digital ID Card and QR Attendance Management System** that can handle **5,000+ participants**, with future scalability. It must have **ZERO connection to Gujarat Forms (GF)**: no GF website, database, code, login, subscriptions, API, branding, or admin panel. The organizer operates the whole system using **one private Organizer Link/Dashboard within this independent project**. There must be no additional unrelated admin product. The participants have their own simple public login link; authorized staff can use a restricted scanner link. The organizer should be able to manage multiple independent events over time.

Work in **JavaScript/JSX** (do not convert the project to TypeScript). Preserve the current stack wherever practical: **Next.js App Router, Node.js server runtime, React, Supabase PostgreSQL + Supabase Auth, Vercel hosting**, and suitable small libraries for Excel, QR and PDF. Prefer minimal, maintainable dependencies. All data must persist in Supabase; do not use local JSON, Vercel ephemeral files, or browser localStorage as the authoritative database. Avoid assuming that Vercel Hobby or Supabase Free guarantees capacity or commercial-use eligibility; explain their current constraints and recommend a paid plan when warranted.

**Language/UI:** Mobile-first, neat professional interface; prioritize **Gujarati labels and clear Gujarati help text**, with English technical labels where useful. Correct Unicode handling for Gujarati names and Excel exports. Offer English/Gujarati language switching if feasible, without compromising core features. UI must work well on normal Android phones and desktop computers.

**Existing Supabase project:** `https://iootyzdvoqoqbvznufpu.supabase.co`. Use the existing `.env.local` values in my local workspace if present; never print, log, commit, paste into answers, or expose secret values. Required variable names include:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MEMBER_ACCESS_PEPPER
MEMBER_SESSION_SECRET
```

Never prefix server secrets with `NEXT_PUBLIC_`. The PostgreSQL direct connection string is not necessary for runtime if using `supabase-js`. If you need extra variables, add placeholders to `.env.example`, document why, and use secure methods to obtain them. Keep `.env.local` gitignored. Never request that I paste confidential passwords, service-role keys or database connection strings into public chats.

## 0 — FIRST: Audit the EXISTING project

1. Inspect the actual files and summarize what is **already implemented**, what is **broken**, what is **incomplete**, and what must be **changed**. Verify existing project routes, the SQL schema, `README.md`, and package versions instead of assuming them.
2. Install dependencies (`npm install` or lockfile-aware equivalent), run existing tests, lint/check syntax if configured, and `npm run build`. Fix reproducible errors. Preserve working functionality.
3. Check security boundaries for organizer/member sessions, Supabase service role, API authentication, authorization, RLS, validation, import idempotency, and concurrency. Never blindly trust `eventId`, `memberId`, or browser state.
4. Provide a short prioritized action plan, **then implement it**. Do not stop at prose, pseudocode, sample layouts, or unconnected components.
5. Reuse the existing structure, including currently present routes where suitable:
   - `/organizer/login`, `/organizer`, `/join/[slug]`, `/my-card`, `/scan?eventId=...`
   - `/api/organizer/events`, `/import`, `/members`, `/meetings`, `/scan`, `/export`, `/reset-code`
   - `/api/member/login`, `/me`, `/profile`, `/logout`
   - `components/ImportSheet.js`, `sql/schema.sql`, and `lib/*`.
6. Write **non-destructive, repeatable SQL migrations** for existing Supabase data. Do not reset/drop the live database, delete members, regenerate QR tokens, or invalidate credentials unless explicitly required and approved. If schema already exists, migrate safely.

## 1 — Organizer identity and event management

- Organizer logs in securely using **Supabase Auth email/password**; allow-list organizers in an `organizers` table; do **not** provide open public organizer signup.
- Organizer's **single dashboard link** must include Event creation/selection, Excel import, column mapping, import status, member search/editing, link sharing, 3 meeting settings, authorized scanning, live counts, and reports/export. No GF account or GF admin access.
- Support multiple events with separate event IDs, unique slugs, records, meetings and QR validity. Nobody should see or manipulate another organizer's events.
- Create three default meetings per event; each meeting has its own title, date, status (not started/open/completed), and optional start/end times. Use `Asia/Kolkata` time consistently for event controls; enforce all scan windows **on the server**. Do not silently mix UTC dates with Indian local dates.
- Event management: editable event name, optional organizer/event logo, venue, contact text, participant count, links, opening/closing event status. Make optional properties truly optional.
- Optionally add scoped **scanner-staff accounts** for multi-device scanning, authorized by the organizer, but do not build a separate global admin panel. Staff must not have access to Excel exports, private access codes, or unrelated events. Organizer may also scan directly.

## 2 — Excel/CSV upload and flexible column mapping

**Core requirement:** Organizer uploads an Excel file where each row is **one participant** and chooses which uploaded columns map to system fields. Some sheets may have dozens of unknown columns. Never force every source sheet to use the same structure.

- Support `.xlsx` and `.csv` first; make `.xls` handling explicit if unsupported. Parse files without uploading the raw Excel file to public storage. Use a spreadsheet library that is secure and maintained.
- Show first-row headers, a 5–10 row preview, total row count, missing-data counts, and dropdown mapping with options **Ignore / First Name / Father Name / Surname / Mobile / Pincode / Village / Taluka / District / Address / Custom Field**.
- Auto-suggest mappings for Gujarati, English and common spelling variants, but the organizer must be able to correct every mapping before import.
- **Mobile** and **First Name** must be mapped to import; do not allow two columns to map to the same single-value standard field. Unknown mapped columns must survive as `extra_data` with original labels. Do not silently discard selected data.
- Normalize Indian mobile numbers carefully (`10 digits`, optionally `+91`/`91`); retain leading zeroes in PIN codes; trim whitespace; support Gujarati names, Gujarati digits where safe and documented; validate six-digit PIN codes if supplied. Warn about Excel numeric formatting changing mobile/PIN values.
- Duplicate handling: `(event_id, normalized_mobile)` unique. Same mobile may appear in *different* events. Detect duplicates within a sheet, previous imports, and simultaneous requests. Show rows created, skipped, rejected and reasons. Never overwrite confirmed profiles or QR tokens during a repeat import without organizer-approved update rules.
- Handle **5,000–20,000 rows** efficiently with chunked server requests (about 100–150 rows per chunk), progress indicator, retry, cancellation, timeouts, and **resumable/idempotent imports** using batch/job IDs and stable row identifiers. A lost network response must not cause silent duplicate creation or unrecoverable access codes. Design credential capture/recovery carefully.
- Organizer can download an **Import Error Report** and securely export newly generated access codes with names/mobiles, including the correct relationship to each member. Explain that plaintext codes are shown only when issued and should be delivered privately, not posted in group chats. Add secure code reset and session invalidation. Never put access codes in public attendance exports.
- Add sample Excel/CSV template, usage instructions and an import dry-run mode if feasible.

## 3 — Separate participant mobile login

- Participant joins via a shareable event-specific URL such as `/join/[slug]` (the same URL for all event members).
- Login with **registered Indian mobile number + that person's own secure random temporary access code**. A code is generated for each imported person and stored only as a secure HMAC hash. Do **NOT** use `PIN code + last four mobile digits`, plain text passwords, or SMS OTP unless a verified SMS provider is separately connected and paid for.
- Keep **OTP as an optional future integration**, not a requirement for this free MVP. Do not falsely label access-code login as phone ownership verification.
- On each login: verify member is active and belongs to requested event; use event-specific credentials, generic failure text, request size checks, rate limits by IP/mobile, brute-force protection, and secure HTTPS-only session cookies (`HttpOnly`, `Secure`, `SameSite`, appropriate expiry). Apply CSRF/origin protections for state changes.
- Organizer may reset lost credentials, revoke member sessions, deactivate/reactivate a member, and correct member details with audit tracking. Participant must not be able to change identity or another participant's record.

## 4 — One-time profile verification and saving

After first successful login, automatically show the participant's **own row**: Name, Father Name, Surname, Mobile, PIN, Village, Taluka, District, Address, and selected custom fields. **Imported values should be prefilled**; **blank or required items visibly marked “Pending”**.

- Allow the participant to fill missing data and correct allowed fields. The mobile number is read-only; changing it needs an organizer-controlled verified process. Validate on both UI and server, and preserve field values already stored.
- Provide an accessible **Confirm & Submit** button and a final confirmation review. Save changes permanently to Supabase. Record `profile_confirmed`, `confirmed_at`, `updated_at` and relevant audit details.
- Ask for confirmation **only once**. Subsequent logins go directly to their card. After confirmation, participant cannot arbitrarily edit confirmed identity; organizer has a controlled correction route.
- If required fields are incomplete, prevent confirmation and clearly list what is missing. Configure truly required fields so the organizer does not accidentally require optional PIN/Village/Address for all events.
- Organizer dashboard shows confirmed, incomplete, inactive and never-logged-in counts. Protect data from being leaked through APIs or caches.

## 5 — Digital member ID card and QR code

- After successful confirmation, show a neat, responsive **Digital Event ID Card** with event name, participant's full name, member ID, optional village/location, masked mobile, optional photo, and a large high-contrast **scannable QR**.
- **One stable unique QR per participant per event must work at all three meeting check-ins**. The selected meeting determines which attendance is recorded; do not make 3 separate participant QR codes. QR must contain a **high-entropy opaque token**, not raw mobile, PIN, member PII, temporary code, or a public endpoint that self-marks attendance.
- Provide **Download Card (PDF and/or PNG)** that really generates a usable local file on mobile, and a printable A4 option. Existing `window.print()` can be kept as fallback but prefer a proper download, not a dead/demo button.
- If an event supports a second verification QR in the future, keep it separate; it is **not** required for basic 3-meeting attendance.
- Prevent member A from fetching member B's ID/QR. Display card only from authorized member session.

## 6 — QR scanning + 3 separate days of attendance

- Organizer opens scanner from the same Organizer Dashboard, selects **Meeting 1 / 2 / 3** (or authorized staff uses a scoped scanner link), and gives camera permission over HTTPS. Support Android Chrome and desktop browsers. Add a safe manual token/member lookup fallback for camera problems, with explicit organizer authorization and audit trail.
- On scan, **server-side** verify: scanner authorization, organizer/staff event permission, correct event, correct meeting, meeting's scheduled India-local date/time, meeting open/not completed, participant exists/active, profile confirmed, and QR token validity.
- A successful scan records attendance with event_id, meeting_id, member_id, server scan timestamp, scanner ID, and method. Response clearly says **Present** plus member name/ID, with audio/vibration feedback if possible.
- **Same member scanned twice in the same meeting => “Already Present”; do not create a second record.** The very same QR may be scanned once in Meeting 1, once in Meeting 2, once in Meeting 3. Ensure duplicate protection is **atomic in PostgreSQL** with `unique(meeting_id,member_id)` and correct handling of simultaneous scanner requests. Never rely only on a frontend duplicate check.
- Invalid/wrong-event/closed-meeting/not-confirmed scans must return clear messages and not change attendance. Safely support many concurrent organizer/staff scanner devices.
- Mark **Pending** before a meeting closes, **Present** after a valid scan, and **Absent** after that meeting is explicitly completed without a scan. Preserve the real scan timestamp, in India time when displayed/exported.
- Organizer can see live total present, absent, pending, recent scans, and search a member's attendance across all three meetings. Corrections need authorized action, reason, timestamp, and audit log; never silently erase scan records.

## 7 — Final updated Excel report

- Organizer can download a **real `.xlsx` workbook** (prefer this over merely renaming `.csv`); keep a Unicode UTF-8 `.csv` option if useful. Must work for 5,000+ members without truncation or Supabase's default 1,000-row query limit.
- Export one row per participant with **all retained mapped/imported fields, corrected final profile fields, custom fields, mobile and member ID, profile confirmation status, Meeting 1/2/3 status, each scan timestamp, total attendance count, and overall complete/incomplete status**.
- Example columns: `Member ID | First Name | Father Name | Surname | Mobile | PIN | Village | Taluka | District | Address | [Custom columns...] | Profile Confirmed | Meeting 1 Status | Meeting 1 Time | Meeting 2 Status | Meeting 2 Time | Meeting 3 Status | Meeting 3 Time | Total Present`.
- Add filters and separate report sheets if manageable: `All Members`, `Present Summary`, `Absent/Pending`, `Import Errors`; keep schema consistent and prevent broken formulas. **Escape spreadsheet formula injection** for any user-controlled strings.
- Export must be authenticated and event-scoped. Avoid including temporary access codes, hashes, server secrets, internal IP addresses or session cookies.
- Preserve original Excel-like header ordering where useful; document what happened to ignored fields (ignored columns should not be saved/exported).

## 8 — Data model and security architecture

Inspect and adapt the present Supabase SQL tables: `organizers`, `events`, `event_members`, `meetings`, `attendance`, `import_batches`, `member_login_attempts`. Add only necessary supporting structures, e.g. `import_rows`, `scan_audit_logs`, `organizer_staff`, `member_activity`, role grants or event settings.

- PostgreSQL keys, foreign keys, unique indexes, event-scoped query indexes, appropriate RLS, and safe server-side service-role usage are mandatory.
- Do not expose any privileged Supabase client in the browser. `service_role` belongs strictly on the server. Authenticated organizer requests must verify Supabase Auth user and event ownership or scoped scanner role on every endpoint.
- Session/token issuance must be secure and revocable. Do not expose the QR token in public member search/list API responses. Rate limit login and sensitive endpoints. Set response caching headers to protect PII.
- Validate/cap all incoming file row sizes, payload sizes, headers, URLs, event names, filenames and custom-field keys. Do not trust frontend input or uploaded Excel as code. Protect against XSS, CSV injection, data leakage, duplicate calls, race conditions and brute force.
- Add privacy notice/consent for personal data, retention/deletion policy, backup/restore steps and restricted access to member data. Do not send member data to third-party analytics without consent.
- Import and attendance must remain consistent if a network request is interrupted. Prefer database-backed status and atomic/idempotent operations for sensitive workflows.

## 9 — Performance, testing and reliability

- At least **5,000 realistic synthetic members** in a test/seed dataset (do NOT use real people's data). Verify import, paginated lists, searching, profile updates, and complete Excel export on the full set. Try 10k–20k synthetic records if practical.
- Test parallel scanners, duplicate scan races, wrong-event QR, multiple meetings, incorrect event date, closed/completed meeting, lost-code reset, unauthenticated requests, unauthorized organizer access, repeated imports, failed/retried batches, and stale participant sessions.
- Add unit tests for normalization, mapping, security/credentials and status calculations; integration tests for API workflows; and browser/e2e tests for primary flows if infrastructure permits.
- Run `npm test`, `npm run build`, and any lint/type checks available. Fix all newly introduced failures. If you cannot test an external Supabase instance without credentials, distinguish simulated tests from live verification and tell me exactly what remains untested.
- Avoid accidental logs of access codes, mobile/PII, or secrets. Use safe errors for users and structured error logging without sensitive contents.

## 10 — Deployment and practical operations

- Keep the app ready for a **separate private GitHub repository** and a **separate Vercel project**, with zero dependencies on GF.
- Provide updated `.env.example`, SQL migration files, clear `README.md`, sample import workbook/CSV, setup and deployment instructions, Supabase SQL Editor instructions, organizer bootstrap/setup, and all necessary CLI commands.
- Explain exact steps for linking existing Supabase project and Vercel environment variables **without revealing any actual secrets**. Mention custom domain optional, HTTPS for camera access, and Supabase Auth configuration.
- Call out limitations of **Vercel Hobby for commercial use**, Supabase Free quotas/inactivity pausing, bandwidth/DB limitations, possible real-world event load, and how/when to upgrade before a 5,000+ participant live event. Do not promise that free tiers are guaranteed for a production-sized event.
- Include a pre-event operations checklist: import count reconciliation, credentials delivered privately, backup before event, 3 meeting dates verified, 2–3 test scanner devices, test on real Android phones, internet/Wi-Fi fallback plan, code-reset procedure, trial scans without corrupting live data, and backup/export after every day.

## 11 — Delivery and acceptance criteria

**Implement the actual code** in the existing repository, not just give suggestions. At the end provide:

1. Short summary of features completed, modified/new files, and any SQL migrations.
2. Actual routes/links and end-to-end user flows.
3. Working setup, test and build commands; test results and explicit untested gaps.
4. Exact steps I personally must perform in Supabase and Vercel, with no request for secrets in chat.
5. Safe final source-code handoff (repository changes and/or ZIP if supported).
6. A numbered checklist showing every requirement below as `Done`, `Partial`, or `Not yet`, with any blockers and next development step.

**Acceptance flow (must work end to end):**

- Organizer logs in through independent Organizer Link, creates Event, sets 3 meeting dates.
- Organizer uploads an Excel sheet with 5,000+ participants, previews columns and maps `Name`, `Father Name`, `Surname`, `Mobile`, `Pincode`, `Village`, plus any chosen fields.
- System safely creates one member per valid unique mobile for that event; progress and rejected rows are visible; retries do not duplicate members or lose credential handling.
- Member opens common event-specific link, logs in with mobile + private random access code, reviews imported values, fills Pending fields, and submits one-time confirmation.
- Member can thereafter log in and download their genuine QR ID Card without repeating confirmation.
- Authorized staff scans that **same participant QR** in Meeting 1, 2 and 3 on their respective days. Every scan is saved once to the correct meeting; repeated scan in the same meeting says `Already Present`.
- Organizer closes/completes meetings, sees Present/Absent/Pending, and downloads updated `.xlsx` showing final corrected member data and all 3 meetings' attendance.
- GF remains completely disconnected throughout.

**Working style:** Be proactive; inspect, plan, code, run tests, fix errors and update documentation. Prefer secure reasonable defaults if minor decisions are unclear, note assumptions, and do not interrupt for unnecessary clarifying questions. Never claim a feature is working if only a mock/demo UI was created. Ask permission before destructive database changes or actions with real financial cost. Continue until all feasible requirements are implemented, and clearly name any external-account/deployment steps that only I can complete.
