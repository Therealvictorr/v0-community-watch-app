# Idanu launch implementation

Idanu is the selected brand. Its Hausa meaning is eyes. Name, domain and trademark registration are not part of this implementation.

## Implemented

- Reviewed public case board; pending, hidden, rejected and duplicate cases stay off it.
- Missing people, reported kidnappings, lost/stolen belongings and found-belonging listings. Found listings do not inflate missing/recovery totals.
- State/area, creation-period, category and outcome filters; nearby distance filtering; a unified map with honest handling of absent coordinates.
- Submit-only place search using Nominatim, a database-backed application-wide rate limit, cached requests and an operator-configurable GEOCODING_BASE_URL. Map selection and a draggable pin; manual fields remain available.
- Approximate public last-seen coordinates rounded in both the form and database. Exact sightings remain private.
- Atomic case submission with private contacts, incident grouping, report photos and a review-before-publication workflow.
- One record per person with shared incident IDs. Owners can change missing to reported kidnapping without creating another person record.
- Owner-only outcome updates, optional found town/state, separate recovery-location statistics, and administrator-verified or disputed outcomes.
- Admin review desk, flags, duplicate handling, owner corrections, private review notes and audit history.
- Follow/unfollow cases; private in-app updates and new-tip notifications; unread/read inbox; owner check-ins and deduplicated overdue reminders.
- Private storage with short-lived signed report-photo URLs and role-based read/write policies. No contact phone/email is published in case records or exports.
- Supabase PKCE email-confirmation callback; consistent Idanu naming; strict TypeScript checks enabled for builds.

## Required live setup

The workspace has only a Supabase URL and public client key. It has no PostgreSQL connection, service-role key, Supabase access token or installed database CLI. No live schema or permissions have been changed.

1. Back up the database and apply `scripts/idanu-launch.sql` once in the Supabase SQL editor, or with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/idanu-launch.sql`. Use a privileged connection. This single bundle includes the earlier private-sightings migration; do not apply both the bundle and its component migrations. It intentionally migrates existing public contact values into a private table and makes report/sighting image buckets private. Existing cases enter the pending queue; approve them before they appear publicly.
2. Sign up and verify `therealb205@gmail.com` using Supabase email confirmation. The migration grants this verified account the protected admin role immediately if it already exists, or when email confirmation completes. It does not create an account, set a password or send an invitation.
3. Add the app's `/auth/callback` URL to Supabase Auth redirect URLs and check the deployed Site URL. Use an actual account to test signup, confirmation, login, a report/photo, an owner tip, following, moderation and outcome verification.
4. If pg_cron is already enabled, the migration installs a daily reminder sweep at 08:00 UTC (09:00 WAT). Otherwise enable Supabase Cron and schedule `SELECT public.idanu_enqueue_reminders()` daily. Owners also get due reminders when opening the inbox. No email/SMS is sent.
5. Validate policies and buckets in a staging database before launch. `tests/security.sql` is a rollback-only database authorization test; run it with a privileged connection after applying the bundle. Existing externally cached public images cannot be retroactively recalled.

## Validation

- `npm test`: focused case/statistics/location and mocked HTTP authorization tests.
- `npm run typecheck`: full project TypeScript check, including retained legacy components.
- `npm run build`: production build; does not bypass TypeScript errors.
- `IDANU_DEMO_MODE=1` enables illustrative read-only case-board data for local previews without querying live cases. Do not set it in production.
- Browser automation failed to initialize in this environment. Visual/mobile verification and authenticated database-backed end-to-end testing require a working browser and the migrated database; do not treat mocked route tests as RLS tests.

## Scope limits

In-app notifications are durable once the migration is applied. External email, SMS, web push, emergency dispatch and live device tracking are not implemented. Nominatim requires compliance with its usage policy; this implementation deliberately avoids autocomplete and throttles across server instances through PostgreSQL. For larger deployments configure an appropriate provider/self-hosted endpoint.
## Verified in this session — 17 November 2026

- Final Webpack production build completed successfully with TypeScript checks enabled.
- All 20 checks passed: 13 case/location/authorization tests and 7 HTTP checks against the built local demo.
- The local preview runs at http://127.0.0.1:3100 in demo mode. It cannot create live reports through the preview UI.
- The read-only Supabase probe returned fetch/network failures, so the remote schema state could not be established. No migration was applied and no live account or case was created.
- `tests/security.sql` has been written but not executed; database RLS, storage permissions and the real authenticated journey remain unverified until a privileged database connection is available.
- Browser and Windows visual automation could not initialize. Mobile/visual QA remains outstanding.

## Integration update — 18 November 2026

- Integrated the current main branch while preserving its removal of blockchain features.
- Removed the hero eyebrow and retained the blue Idanu branding.
- Updated Next.js to 16.4.6 and Zod to 4.6.7, removed unused Cosmos packages, and applied non-breaking transitive dependency fixes. The dependency audit reports zero vulnerabilities.
- The user reported a successful launch migration. Read-only checks now confirm that the configured project exposes the required schema and functions; the exact anonymous landing query returns HTTP 200 with zero approved rows. Do not rerun the launch bundle on this already-migrated database.
- The deployed preview loading error was traced to DNS ENOTFOUND for an old Supabase project hostname. The locally configured project is different and its anonymous query succeeds. Update Vercel Preview and Production to the matching URL and anon key from the working local .env.local, then create a new deployment. SQL does not need to be rerun. Live verification is pending that environment correction.
- Current product branding is Idanu. Historical deployment logs are not rewritten by branch renames.
