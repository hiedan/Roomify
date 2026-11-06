# Quickstart: Auth Verification

## Prerequisites

- Node.js 18+
- Two separate Supabase PostgreSQL/PostGIS projects: Roomify (application) and Roomify-Test (automated tests)
- Backend environment variables set for `DATABASE_URL`, `SUPABASE_PROJECT_REF`, `TEST_DATABASE_URL`, and `TEST_SUPABASE_PROJECT_REF`
- `backend/` dependency installation complete
- Optional frontend setup for UI verification: `frontend/` dependency installation complete

The frontend/backend may run locally while both databases are hosted on
Supabase. Docker Desktop/Compose and a local PostgreSQL service are not required.
The current setup below replaces the earlier local-database instructions.

## Setup

```bash
cd backend
npm install

cd ../frontend
npm install
```

Configure your private `backend/.env` without overwriting existing values. Follow
the [root database setup](../../../README.md#database-and-local-environment):

- Roomify and Roomify-Test must have different project references. They may both
  use the database name `postgres`; database names alone do not prove isolation.
- Copy each project's PostgreSQL Direct or Session pooler URL from its Connect
  settings. Use port 5432; Transaction pooler mode on 6543 is rejected.
- `MIGRATION_DATABASE_URL` and `TEST_MIGRATION_DATABASE_URL` are optional. Each
  must identify the same project and database as its matching runtime URL.
- TLS verifies certificates and endpoint hostnames. If a CA is required, set
  `DATABASE_CA_CERT` or `TEST_DATABASE_CA_CERT` to a PEM path relative to
  `backend/`. Keep verification enabled and keep secrets out of frontend variables.
- Shared configuration examples must contain placeholders, not database
  passwords or real signing keys. The application still uses its existing
  Express authentication and `pg` connection, not Supabase Auth.

From `backend/`, prepare and inspect each explicitly configured target:

```powershell
npm.cmd run migrate
npm.cmd run db:check
npm.cmd run migrate:test
npm.cmd run db:check:test
```

The check commands are read-only. Migration commands validate schema/history,
apply pending versioned migrations and handle PostGIS initialization; do not
edit applied migrations or reset the Roomify application project. No database
operation was executed as part of this documentation update.

### JWT signing key (T004)

Set `JWT_SECRET` in `backend/.env` or the deployment environment. The auth service
signs and verifies only HS256 tokens and requires a non-placeholder key containing
at least **32 UTF-8 bytes**. Missing, blank, known placeholder/default, and shorter
keys cause both token issuance and verification to fail with `AUTH_CONFIG_ERROR`
(status 500). The `change-me` example and `dev-secret-change-me` config fallback are
intentionally rejected.

Generate a key locally with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This uses `crypto.randomBytes(32)` to generate 32 random bytes, encoded as 64 hex
characters for an environment variable. Copy the output into `JWT_SECRET` locally;
keep it out of version control and shared logs. The service uses the configured
string as UTF-8 without trimming or decoding hex/base64. Length alone does not
guarantee randomness; use the generated value rather than a repeated or predictable
string. Existing keys shorter than 32 bytes must be replaced; changing the key
invalidates tokens signed with the previous key.

## Run validation

Auth unit tests and lint run from `backend/` without PostgreSQL:

```bash
cd backend
npx jest --config jest.unit.config.js --runInBand
npm run lint
```

The existing integration suite requires PostgreSQL and retains its migration setup:

```bash
cd backend
npm test -- --runInBand --testTimeout=30000
```

Jest selects the validated Roomify-Test target with `NODE_ENV=test`. Global setup
checks project identities before migration/fixtures and holds an advisory lease
through teardown. Both integration and browser tests use this same dedicated
project and must run sequentially. The backend suite can reset test data;
Roomify-Test must not contain application data that needs to be preserved.
Run browser checks from `frontend/` only after the backend test run finishes.

> Historical records: all task-by-task verification checkpoints below describe
> earlier runs, including the former Docker/local PostgreSQL environment. Keep
> their dates, counts and environment details as historical evidence; they do
> not certify the current Supabase setup. Use the setup and commands above for
> current runs. Words such as "current" or "latest" inside those archived
> records refer to that checkpoint, not the present setup. No tests were rerun
> for this documentation-only update.

### Focused T005 verification

Run the middleware integration tests and existing app/database checks using the
unchanged integration configuration:

```bash
cd backend
npm test -- --runTestsByPath tests/authMiddleware.integration.test.js tests/app.test.js tests/db.test.js --silent
```

For current runs, confirm the application and test URLs/references identify the
separate Roomify and Roomify-Test Supabase projects. Global setup migrates only
the validated test target selected by `databaseConfig.js` with `NODE_ENV=test`.
T005 fixtures use synthetic users and delete only their own rows; the existing
database tests also exercise `resetDb()` on Roomify-Test. Never point these checks
at the application project.
The protected probe route is created only inside the integration test app.

Verified on 2026-11-05 with Node.js 24.15.0 and PostgreSQL/PostGIS
`postgis/postgis:16-3.4` through Docker Compose:

| Check | Result |
|---|---|
| T004 + T005 unit tests | 168 passed (127 service, 41 middleware) |
| Focused integration command above | 15 passed (8 middleware, 7 app/database) |
| `npm run lint` | Exit 0; two existing unused-disable warnings in the initial migration and error handler |

The middleware checks Bearer headers, delegates JWT validation to T004, rejects
subjects outside PostgreSQL BIGINT range before querying, and reloads the account
on each request. It returns a safe profile with a string ID and the current DB
role/status. Missing accounts return 401; inactive accounts return 403.
JWT configuration and database failures retain their original error semantics.
T006 role helpers and production auth routes are outside this verification scope.

### T006–T009 foundation verification

The foundation now supplies `requireRole`, `requireAdmin`, a central auth
controller, and the four mounted routes: `POST /api/v1/auth/register`,
`POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and
`POST /api/v1/auth/logout`. The auth-only `authAccountService.js` validates strict
payloads and coordinates parameterized SQL, the existing bcrypt/JWT helpers, and
safe profiles. `authService.validatePassword` exposes the existing T004 validator
for reuse without changing its policy or crypto behavior.

Registration signs the initial one-hour session inside a transaction before
commit; a signing/configuration failure rolls back the account. The existing
email unique constraint handles concurrent normalized duplicates. Login issues
a one-hour or remembered seven-day session. `/me` reloads current DB state through
`requireAuth`. Logout is public/idempotent and acknowledges client-side clearing;
copied JWTs are not revoked. See [the contract](./contracts/auth-api.md) for exact
statuses, accepted payloads, and the explicit role-policy middleware order.

From `backend/`, run:

```bash
npx.cmd jest --config jest.unit.config.js --runInBand --silent
npm.cmd test -- --runTestsByPath tests/authMiddleware.integration.test.js tests/authApi.integration.test.js tests/app.test.js tests/db.test.js --silent
npm.cmd run lint
```

Run `git diff --check` from the repository root. For current integration checks,
all fixtures and the reset helper target the validated Roomify-Test Supabase
project. The following results remain historical and do not describe a new run
against that project.

The T007–T008 descriptions overlap registration/login/session tasks in later user
stories. The handlers and necessary API checks are implemented to make the
foundation functional. At that checkpoint, **T010 onward remained unchecked** for
separate verification; T010–T022 follow-through is recorded below. Frontend/session-storage work,
business-resource ownership integration, admin role/status endpoints, and audit
records are outside T006–T009. Policy probe routes exist only in integration tests.

Verification on 2026-11-05 reused the running PostgreSQL 16/PostGIS 3.4 container:

| Check | Actual result |
|---|---|
| Unit command above | 241 passed: original 168 T004/T005 plus 73 new foundation tests |
| Focused integration command above | 44 passed: original 15 plus 29 auth API/policy tests |
| `npm.cmd test -- --silent --json --outputFile <temporary-report-path>` | 285 passed across all 9 suites; no skipped tests |
| `npm.cmd run lint` | Exit 0; the same two existing unused-disable warnings |
| `git diff --check` | Exit 0 |

One intermediate focused rerun exited with code 1 before emitting a Jest result;
its cause was not established. A subsequent focused run with a temporary JSON
report passed all 44 tests, and the full default test run passed all 285 tests.
No migrations, image changes, `.env` writes, or development-data mutations were
needed for T006–T009. The T005 test files and `requireAuth` implementation were
preserved. This verification does not assert completion of the later user stories.

### T010–T022 backend acceptance verification

All production behavior needed for these tasks already existed in T004–T009.
This checkpoint preserves that implementation and adds missing acceptance tests
to the existing suites. Task paths naming `auth.test.js` map to
`tests/authApi.integration.test.js`, `tests/authAccountService.test.js`, and the
unchanged `tests/authService.test.js`. T012's account input schemas remain in
`src/services/authAccountService.js`; `src/services/authService.js` supplies the
shared password validator and bcrypt/JWT primitives. No code was copied or moved
to match illustrative task paths, and task descriptions/spec/contracts were not
relaxed. Peer review remains pending.

In the table below, **API** means `authApi.integration.test.js`, **account unit**
means `authAccountService.test.js`, and **crypto unit** means `authService.test.js`.
All listed production implementations predate this checkpoint.

| Task | Existing implementation | Test evidence and additions in this checkpoint |
|---|---|---|
| T010 | Strict registration schema and mounted register route | Existing API success/duplicate/validation checks; added missing fields, wrong types, client ID/hash/extra fields and malformed payload checks |
| T011 | Transactional tenant insertion with bcrypt hash | Existing API persistence/hash checks and concurrent duplicate; added sequential duplicate preserving the original row and rejection row-count checks |
| T012 | Account schemas plus T004 password validator | Added account-unit ASCII/Unicode/type/name/email/password boundaries, remember-me defaults, API Gmail dots/plus distinctions and persistence at valid limits |
| T013 | `authController.register` delegates to account service | Strengthened API envelope/profile/tenant-claim checks; existing persistence, session and controller tests retained |
| T014 | `authRoutes` registers POST `/register` | Existing route reused; API registration acceptance checks exercise it through the real app |
| T015 | Single auth mount before notFound/errorHandler | Existing app health/404/JSON checks retained; added malformed payload checks on both public auth endpoints |
| T016 | Strict schemas, `users_email_key` translation and transaction | Existing real concurrent registration/config-error rollback retained; added signer fault inside a real transaction, empty result after rollback and successful retry with the same email |
| T017 | Existing login flow and credential/status errors | Existing active-role, unknown/wrong-password/inactive API cases retained; added invalid payloads and token-issuance rejection assertions |
| T018 | T004 standard/remembered TTL and token verification | Crypto unit expiry tests unchanged; API covers omitted/false/true rememberMe, actual `exp - iat`, acceptance just before expiry and rejection at/after expiry using restored `Date.now` spies |
| T019 | T004 `verifyPassword`/`issueToken`, account orchestration | Existing crypto tests retained; added account-unit forwarding/boundaries and real API rejection of trimmed/lowercased/modified passwords |
| T020 | `authController.login` and mounted POST `/login` | Existing normalized-email and DB-error unit coverage retained; added API strict input cases and malformed bodies without duplicating routes |
| T021 | Password verification precedes inactive check and token issuance | Existing unit no-issuance checks retained; API now explicitly asserts the token path is not called for inactive/invalid credentials; DB/config failures preserve their error classes |
| T022 | Safe profile from queried DB row, string BIGINT IDs | Added API login after DB role changes with maximum BIGINT ID, profile/JWT agreement and credential/token logging checks |

Registration continues to create a standard one-hour session even if its optional
boolean `rememberMe` is true, as already specified in the contract and FR-005 /
FR-010. Only login's remember-me option selects seven days. Name lengths use
UTF-16 code units; password minimum length uses Unicode code points, with the
independent 72-byte UTF-8 ceiling. Gmail normalization does not merge dots/tags.

Actual verification on 2026-11-05, from `backend/`:

```powershell
npx.cmd jest --config jest.unit.config.js --runInBand --silent
npm.cmd test -- --silent --json --outputFile "$env:TEMP/roomify-t010-t022-final-results.json"
npm.cmd run lint
```

| Check | Actual result after final test changes |
|---|---|
| Unit command | 301 passed across 5 suites, including all 127 unchanged T004 tests and 41 unchanged T005 unit tests |
| Full backend command | 393 passed across 9 suites, zero failed/skipped; includes 77 auth API tests and the existing real PostgreSQL integration/app/DB checks |
| New coverage | 60 account-unit cases and 48 additional API cases compared with the 285-test foundation checkpoint |
| Lint | Exit 0, zero errors; the same two existing unused-disable warnings in the initial migration and error handler |
| `git diff --check` at repo root | Exit 0 |

Both final test commands passed on their first execution in this checkpoint;
no intermittent failure occurred here. The earlier unexplained exit remains a
historical observation from T006–T009, not a diagnosed defect or a claimed fix.
The already-running Docker service/image was reused. Fixtures and resets used
only `nhatro_test`; no development data, `.env`, schema, production source or
T004/T005 test files were changed. The signer fault mocks only `jwt.sign`;
PostgreSQL and transaction handling remain real in that integration test.

T010–T022 are checked for backend implementation and verification. T023 onward
remained unchecked at that checkpoint; the selected follow-through is recorded
below. Frontend/browser-storage verification, business-endpoint ownership
integration, admin role/status flows and audit work were not completed there.

### Selected US3/US4 backend tasks

This checkpoint covers only T023, T024, T026, T028, T029, T030, T032 and T033.
T025/T027 (real business-endpoint integration), T031/T034 (browser/frontend
coordination), and T035 onward remained unchecked at that checkpoint. The admin
follow-through is recorded below. Peer review remains pending.
The existing production auth routes/controller, crypto/account services,
`requireAuth` implementation and all earlier regression test cases are retained.

| Task | Implementation and verification evidence |
|---|---|
| T023 | Expanded `authApi.integration.test.js` exercises real `/auth/me` with absent/malformed headers, empty, tampered, wrongly signed and expired tokens. Existing deleted/inactive cases are retained. The ownership mutation harness separately proves rejected sessions cannot reach protected work or modify fixture content. |
| T024 | Existing `authRole.test.js` checks the complete three-role guard matrix. Existing API policy probes and new ownership probes verify 401 vs 403, current DB role, no inherited admin landlord permission, and no admin ownership bypass. These are middleware-policy tests, not real business-endpoint integration. |
| T026 | Added `requireOwnership` in `auth.js`, using a parameterized owner-only listing read, canonical string BIGINT IDs, active identity validation shared with role guards, and Express 4 error forwarding. New ownership suites cover the predicate and its PostgreSQL chain. |
| T028 | The sole protected production auth route is `/auth/me`, which already reloads its account through `requireAuth` on each request. Same-token role/status/deletion/reenabling checks exercise real PostgreSQL state and ignore client role/status. Future resource routes remain T027 work. |
| T029 | Existing AppError/errorHandler semantics are reused and verified through HTTP: 401 UNAUTHORIZED, 403 FORBIDDEN/INACTIVE_ACCOUNT, 500 AUTH_CONFIG_ERROR and safe generic DB 500 responses. Unexpected DB errors are never relabeled as credentials/permission failures. |
| T030 | Real `/auth/me` checks cover valid, expired, deleted and inactive sessions; maximum BIGINT profile ID and current DB profile fields are verified. These prove backend restoration validation, not browser restoration. |
| T032 | Existing GET `/auth/me` and POST `/auth/logout` routes are reused. Logout remains public/idempotent, works with unusable credentials, and does not revoke a copied valid JWT. |
| T033 | Session validation remains split between `authService.verifyToken`, `requireAuth` DB revalidation and `authController.me` safe-profile response. No duplicate DB authorization flow was introduced into the crypto service just to match the illustrative task path. |

Ownership middleware consumes `req.params.id` and the trusted active `req.user`
profile. Use the chain `requireAuth`, `requireRole('landlord')`, then
`requireOwnership` for future landlord-owned listing operations. The predicate
does not grant any role or an admin override. Invalid listing IDs return
400 VALIDATION_ERROR, missing listings 404 NOT_FOUND, and non-owners
403 FORBIDDEN. See [the ownership contract](./contracts/auth-api.md#listing-ownership-middleware-t026).
No production listing route, controller or CRUD flow was added.

The guard reads ownership at one point in time. A future mutation must also
constrain its SQL by the authenticated owner or use an appropriate transaction
to handle concurrent ownership changes. The test-only mutation probe includes
that owner predicate, but is not evidence that T025/T027 business routes exist.

`tests/authOwnership.test.js` provides 41 unit cases. The separate
`tests/authOwnership.integration.test.js` provides 20 PostgreSQL/PostGIS cases,
using synthetic users/listings and deleting only its own fixtures. Its local
Express app composes the middleware and a minimal mutation probe; successful
ownership reaches the probe, while rejected requests leave the fixture unchanged.
No probe is mounted in production. The real auth API suite now contains 90 cases,
including 13 new auth/session cases. One user-reload failure and one ownership
query failure are injected into otherwise real DB-backed integration flows to
verify safe HTTP error handling; the DB is not replaced for persistence checks.

Actual verification on 2026-11-05, from `backend/`:

```powershell
npx.cmd jest --config jest.unit.config.js --runInBand --silent
npm.cmd test -- --runTestsByPath tests/authOwnership.integration.test.js tests/authApi.integration.test.js --silent
npm.cmd test -- --silent --json --outputFile "$env:TEMP/roomify-t023-t033-final-results.json"
npm.cmd run lint
```

| Check | Actual result |
|---|---|
| Unit command | 342 passed across 6 suites, retaining all 301 earlier unit cases |
| Focused auth/ownership integration | 110 passed across 2 suites |
| Full backend after final test edits | 467 passed across 11 suites; zero failed/skipped, retaining all 393 earlier cases |
| Added coverage | 41 ownership unit, 20 ownership integration and 13 auth/session API cases |
| Lint | Exit 0; zero errors and the same two existing unused-disable warnings |
| `git diff --check` at repo root | Exit 0 |

Expired-token fixtures preserve a valid issue/expiry interval and signature,
with expiry already in the past; no waiting or JWT primitive rewrite is needed.
The full suite was run again after strengthening those expiry fixtures. The
running Docker/PostGIS environment was reused, and fixture/reset SQL targeted
only `nhatro_test`. No schema, `.env`, frontend, production resource routes or
server-side session/revocation store changed. Backend tests do not establish
browser storage clearing or browser restore/logout behavior.

### T035–T045 admin role/status and mandatory audit

Implemented production endpoints are PATCH `/api/v1/admin/users/:id/role` and
PATCH `/api/v1/admin/users/:id/status`, mounted through `adminRoutes.js` and
`adminController.js`. `adminService.js` coordinates strict payload validation,
transactional authorization, updates and audit. No frontend or audit-viewer
endpoint was added. Peer review remains pending.

Both routes use existing `requireAuth` and `requireAdmin`. The service validates
canonical string BIGINT IDs, locks actor/target user rows in numeric ascending
order with `FOR UPDATE`, and re-checks active-admin and non-admin-target conditions
inside the transaction. Update and audit INSERT use the same checked-out
connection. Failures rollback and release it; rollback failure also discards the
connection while preserving the original error. The common ID predicate was
extracted to `utils/databaseId.js` and the existing account `safeProfile` projection
is reused rather than duplicating validation or authentication logic.

FR-022 makes audit mandatory despite T040's conditional wording. New migration
`1700000001000_admin_action_audits.js` creates the audit table, value constraints,
retention foreign keys and indexes. Role/status changes record actor, target,
action, exact old/new values and DB timestamp; passwords/hashes/tokens are absent.
Refer to the [data model](./data-model.md) and updated
[ERD](../../../docs/analysis-and-design/ERD_Roomify.mmd).

Both endpoints return `200 { success: true, data: { user, changed } }`, where
`user` is a safe current DB profile. A same-value request returns `changed: false`
after authorization/target checks and produces neither UPDATE nor audit INSERT.
Admin targets (including self-targets) remain forbidden even for no-ops; requested
admin grants are invalid input. See the [admin contract](./contracts/auth-api.md#admin-endpoints)
for payloads and 400/401/403/404/500 errors.

| Task | Implementation and verification evidence |
|---|---|
| T035 | Real-app admin API cases cover both role transitions, guests/invalid/inactive/non-admin actors, strict input, invalid BIGINT IDs, missing/admin/self targets, and rejected changes without audit. |
| T036 | PostgreSQL persistence and old/new audit values are checked in both role directions; the existing target token sees the new role on its next `/auth/me` request. |
| T037 | Admin controller delegates to the service, returns the standard safe envelope and forwards async failures to Express 4; four controller unit cases exercise it. |
| T038 | The real PATCH role endpoint accepts only tenant/landlord, rejects admin grants/admin targets and preserves BIGINT IDs through DB/profile/audit. |
| T039 | Existing auth/admin guards enforce route access; the service repeats actor/target checks under transaction locks. Real SQL interleavings after the middleware snapshot prove revalidation. |
| T040 | The new mandatory audit migration and single-connection transaction are tested with actual PostgreSQL constraint failures in audit INSERT and account UPDATE; each leaves both state and success audit unchanged. |
| T041 | Real disable/enable requests, role/status no-ops, boolean-only payloads and denial cases are covered with current-token/login checks. |
| T042 | The history regression compares account data (excluding only is_active), listing content/moderation, images, amenity links, nearby-place records and favorites before/after disabling and enabling. |
| T043 | PATCH status is mounted in the real app and returns the safe profile plus changed flag. |
| T044 | Only non-admin targets and actual JSON booleans are accepted; all unauthorized/admin/missing/invalid cases preserve account state and audit. |
| T045 | Disabling blocks login and the old token on the next protected request without issuing a session; enabling restores both valid login and the same unexpired token without extending it. |

`tests/adminApi.integration.test.js` uses the actual production app/router and
hashed synthetic fixtures on `nhatro_test`, not policy harnesses. Its scheduling
hooks change actor/target rows with real SQL after middleware auth and before
transaction checkout; they do not replace DB state reads. Fault cases transform
one statement's parameters so PostgreSQL itself rejects audit/mutation constraints,
then verify rollback through real reads. Concurrent role/status requests commit
both distinct audit records. Reversed actor/target ID order is also exercised.

Cleanup deletes only the suite's fixture audit rows before its users. The reset
helper explicitly includes audit rows and now refuses non-test/non-`nhatro_test`
targets. An extra DB regression verifies reset clears audit/user fixtures while
keeping seeded amenities. The applied initial migration is unchanged.

Actual verification on 2026-11-05, from `backend/`:

```powershell
npx.cmd jest --config jest.unit.config.js --runInBand --silent
npm.cmd test -- --silent --json --outputFile "$env:TEMP/roomify-t035-t045-final-results.json"
npm.cmd run lint
```

| Check | Actual result after final code changes |
|---|---|
| Unit command | 391 passed across 8 suites: earlier 342 plus 45 admin-service and 4 admin-controller cases |
| Full backend | 562 passed across 14 suites; zero failed/skipped, retaining all 467 earlier cases |
| Added integration coverage | 45 real-app admin API cases and one audit-aware reset regression |
| Migration | Audit UP applied successfully only on `nhatro_test`; columns, constraints, FK retention and persistence verified |
| Lint | Exit 0, zero errors; the same two existing unused-disable warnings |
| `git diff --check` at repo root | Exit 0 |

No down/up cycle was run. The development database was not migrated or modified;
normal deployment migrations must be applied separately before using the new
admin routes against another database. The existing Docker image/volume and
`.env` were retained. No token revocation, session table, browser workflow, public
admin provisioning, default production credentials or audit viewer was introduced.
At this T035–T045 checkpoint, T025/T027/T031/T034 remained unchecked and
T046–T049 had not yet been reviewed. See the later T046–T049 handoff below
for their current disposition.

For frontend UI verification in a separate terminal:

```bash
cd frontend
npm run dev
```

For focused auth API checks using the current split test layout:

```bash
npm.cmd test -- --runTestsByPath tests/authApi.integration.test.js --silent
```

## Suggested end-to-end verification scenarios

1. Register a valid tenant account with a new Gmail address.
2. Attempt duplicate registration with the same normalized email and confirm the conflict response.
3. Sign in with the correct password and verify the returned profile and session token.
4. Confirm unknown-email and wrong-password login return the same `INVALID_CREDENTIALS` response; correct credentials for an inactive account return `INACTIVE_ACCOUNT`.
5. Call a protected route as guest, tenant, landlord, and admin to verify role enforcement.
6. Disable a non-admin account and confirm the next login attempt is rejected.
7. Re-enable the account and verify login works again.
8. Update a user's role by admin and verify the new permissions take effect on the next protected request.

## Expected outcomes

These are end-to-end targets; client storage clearing and redirects still require
the separate browser evidence noted in the review record below.

- Public registration only creates tenant accounts.
- Normalized emails are unique and case-insensitive.
- Invalid sessions are cleared and the user is returned to sign-in.
- Role and status checks are enforced on the server, not the browser.

## T046–T049 backend review and pre-commit handoff

Review date: 2026-11-05; workspace `D:\Roomify\Roomify`, branch `HIEN`.
This review inspected the existing unstaged and untracked backend implementation
from T005 onward, not only tracked diffs. The original inventory contained 12
modified and 20 untracked files, with no staged/deleted paths. Existing work was
retained. Human/peer review and the user's commit decision remain pending.
The [root README](../../../README.md) now documents setup, module responsibilities,
actual endpoints, middleware composition and the development migration boundary.

### Findings and disposition

Severity describes the impact of the reviewed code; it is not a penetration-test
score. Synthetic test markers were used instead of real credentials.

| Severity | Location | Finding / impact | Disposition and evidence |
|---|---|---|---|
| High | `backend/src/middlewares/errorHandler.js`, unexpected-error branch | Logging the raw Error could expose PostgreSQL failing-row detail, password hashes, SQL or connection credentials. | Fixed: log only a static event and retain the generic public 500. New unit regression checks response and log arguments; real API DB-failure regression verifies the production handler. |
| Medium | Same file, Zod branch and `notFound` | Zod's default enum/unknown-key text and the original 404 reflected arbitrary input or URLs, potentially including credential-shaped data. | Fixed: suppress rejected values/unknown key names and use a static 404. Unit regressions plus real auth/admin API cases verify these paths; malformed JSON retains the existing safe 400. |
| High | `backend/tests/globalSetup.js`, before migration CLI | The reset helper had a test-DB guard, but global migration setup could run before it against an incorrectly configured target. | Fixed: validate URLs, require `nhatro_test` and reject an aliased development database name before invoking migrations. Six isolated tests include refusal paths and safe configuration errors; full suite migrates only the test DB. |
| Medium | `backend/src/services/authAccountService.js`, `authenticateAccount` | Unknown emails skipped bcrypt while existing accounts performed it, creating an avoidable account-enumeration timing difference. | Fixed: a public non-account cost-12 dummy hash ensures a comparison for unknown emails too. A regression also proves a dummy match cannot create a session. Identical credential response semantics remain; constant total latency is not claimed. |
| Spec gap | FR-019 / development provisioning | No controlled development/demo admin seed or supported provisioning command exists. Test fixtures are not provisioning. | Open, outside the current task implementation scope. README proposes the minimum local, explicitly configured, production-rejecting seed using existing hashing helpers, with no public route, default credential or credential logging. No seed was added. |
| Integration dependency | T025/T027, T031/T034 | Ownership/business handlers and browser storage/session behavior have no complete integration evidence in this handoff. | Open. Harness coverage is identified below and does not satisfy those tasks. No production business route or frontend implementation was added. |

### Code review coverage and limits

| Area | Inspected implementation and verified behavior |
|---|---|
| Passwords | `authService` validates 8 Unicode code points and 72 UTF-8 bytes, bcrypt cost 12, exact password bytes without trim/lowercase/truncation. Account service stores only hashes. Existing T004 tests are retained. |
| JWT/session | HS256 algorithm/signature, expiry and required claims are checked; weak/example/fallback secrets fail with `AUTH_CONFIG_ERROR`. Protected requests read current DB role/status; deleted/disabled accounts cannot continue. Login is 1h or 7d; registration is 1h. Logout is a public idempotent acknowledgement, not revocation or remote storage deletion. |
| Profiles / IDs | Auth/admin response projections contain only the five contract fields; BIGINT IDs remain strings and out-of-range input is rejected before SQL. SQL uses parameterized values. Password/hash/token are excluded from `req.user`, profile responses and audit. |
| Current route authorization | Auth routes and both admin PATCH routes were inspected in the real app. `requireAuth` precedes `requireAdmin`; role/status are never authorized from body/query/JWT role. Explicit role guards grant no implicit admin-to-landlord privilege. |
| Ownership pattern | Guard reads only owner ID, rejects missing/invalid/nonowner actors and does not expose the listing. Unit/real-DB harnesses verify the predicate, not production listing mutations. Real handlers still need authenticated-owner SQL conditions or a suitable transaction; T025/T027 stay open. |
| Registration / login errors | Strict schemas, normalized Gmail, unique-conflict handling at INSERT, invalid credentials, inactive accounts, and independent config/DB failures use the documented codes. Registration signs before COMMIT, so a bad JWT key rolls back the account. Missing-email login performs dummy bcrypt work. |
| Express / connections | Controllers catch asynchronous failures and forward them to the central handler. Services rollback/release their checked-out client on failures; a rollback failure discards the connection and preserves the original error. Existing fault regressions exercise these branches. |
| Admin transactions / audit | Actor and target are locked in numeric ID order and revalidated within one transaction. Admin grants/admin targets are rejected. UPDATE and mandatory audit INSERT share one client; audit failure rolls back state. Authorized no-ops write neither state nor audit. Actual PostgreSQL races, constraint failures, historical-data preservation and re-enable behavior are covered. |
| Error presentation | Auth/admin application statuses/envelopes remain consistent; malformed JSON/strict input/system failures use the central safe handler. Config and unexpected DB errors are not converted to 401/403. No request body or raw Error is logged by this handler. |

This is a source review and automated backend verification of the implemented
paths, not a browser security assessment or independent peer approval. It does
not claim rate limiting, complete timing resistance, JWT revocation, controlled
admin provisioning, or secure production business mutations that are not present.

### Task status and final verification

| Task | Status and scope |
|---|---|
| T046 | Complete: root README and existing feature docs cover actual setup/API/middleware/migration behavior, missing seed and handoff. |
| T047 | Complete: full real-PostgreSQL suite and independent unit config rerun after fixes; results below. |
| T048 | Complete for all implemented auth/admin endpoints: source review, fixes and regression checks recorded above. |
| T049 | **Open**: password/session/current auth/admin review completed, but a final authorization/security gate across feature protected flows still lacks T025/T027 business integration and controlled admin provisioning. Browser evidence T031/T034 is also outside this review. No final security sign-off or peer review is claimed. |

T025, T027, T031 and T034 remain unchecked and were not implemented here.
F001–F003 remain unchecked for frontend-owner verification. FR-019 provisioning
is a separate spec gap; no unrelated task was added or marked complete to hide it.

Final commands, from `backend/` unless noted:

```powershell
npx.cmd jest --config jest.unit.config.js --runInBand --silent
npm.cmd test -- --silent --json --outputFile "$env:TEMP/roomify-t046-t049-final-results.json"
npm.cmd run lint
# Repository root:
git diff --check
```

| Check | Actual final result |
|---|---|
| Independent unit config | 411 tests passed, 10 suites, zero failed/skipped |
| Full backend, real PostgreSQL/PostGIS | 584 tests passed, 16 suites, zero failed/skipped; all 562 previous cases retained |
| Lint | Exit 0, zero errors; two pre-existing unused-disable warnings (initial migration and Express error-handler directive) |
| Whitespace | `git diff --check`: exit 0 |
| Migration target | Existing audit migration present on `nhatro_test`, absent on development `nhatro`; no development migration or data mutation performed |

There was no unstable-test workaround, skipped test, dependency upgrade, Docker
image/volume replacement or `.env` change. Initial failing regression tests
reproduced the logging/reflection/migration-target flaws before the fixes.
The JSON test report is outside the repository in the user's temporary directory.

### Pre-commit inventory at the T046–T049 checkpoint

At that checkpoint, the complete candidate inventory was **15 modified tracked files and 22 new
untracked files**, no deleted/renamed paths and no staged diff. This lists all
pending feature work, including earlier turns; it does not stage it.

Modified tracked paths:

```text
.gitignore
README.md
backend/eslint.config.js
backend/jest.unit.config.js
backend/src/app.js
backend/src/middlewares/errorHandler.js
backend/src/services/authService.js
backend/tests/db.test.js
backend/tests/globalSetup.js
backend/tests/helpers.js
docs/analysis-and-design/ERD_Roomify.mmd
src/specs/001-user-auth/contracts/auth-api.md
src/specs/001-user-auth/data-model.md
src/specs/001-user-auth/quickstart.md
src/specs/001-user-auth/tasks.md
```

New, untracked paths (must be included if the user later stages this feature):

```text
backend/migrations/1700000001000_admin_action_audits.js
backend/src/controllers/adminController.js
backend/src/controllers/authController.js
backend/src/middlewares/auth.js
backend/src/routes/adminRoutes.js
backend/src/routes/authRoutes.js
backend/src/services/adminService.js
backend/src/services/authAccountService.js
backend/src/utils/databaseId.js
backend/tests/adminApi.integration.test.js
backend/tests/adminController.test.js
backend/tests/adminService.test.js
backend/tests/authAccountService.test.js
backend/tests/authApi.integration.test.js
backend/tests/authController.test.js
backend/tests/authMiddleware.integration.test.js
backend/tests/authMiddleware.test.js
backend/tests/authOwnership.integration.test.js
backend/tests/authOwnership.test.js
backend/tests/authRole.test.js
backend/tests/errorHandler.test.js
backend/tests/globalSetup.test.js
```

Changes made specifically in this review: README, central error handler, test
migration setup, account login's dummy comparison, independent unit config,
account/API regressions, contract, quickstart and task progress, plus the two new
error-handler/setup unit suites. The other candidate paths are preserved earlier
feature work. No unrelated candidate was removed. The dummy bcrypt hash and
synthetic test markers are public non-account fixtures, not real credentials.

Pre-commit inspection found no `.env`, local JWT secret, private key, installed
dependency tree, coverage, or test-output path in this candidate set. No frontend,
dependency manifest/lockfile or Docker configuration was changed in this review.
The ignored local `.env` is retained and unchanged. No staging, commit, push,
merge, reset, restore or clean was performed.

Before committing, the user should review the complete modified **and untracked**
implementation, the audit migration and its still-pending development deployment,
the error-log detail tradeoff, the FR-019 seed proposal, and acceptance of the
explicitly open integration/security gates. Human/peer approval remains pending.

## T025 T027 T031 T034 integration handoff

Continuation verified on 2026-11-05, branch `HIEN`, Node.js 24.15.0, existing
PostgreSQL/PostGIS container. The user authorized the necessary frontend and real
listing integration in this continuation. Earlier checkpoint results/inventories
above are historical; this section records the current scope and evidence.

### Mapping and scope decision

| Task | Real implementation / evidence | Status |
|---|---|---|
| T027 | `listingRoutes` mounts production `DELETE /api/v1/listings/:id` with auth, explicit landlord role and ownership. `listingService` locks/revalidates actor and listing, then conditionally deletes with authenticated owner ID. | Complete |
| T025 | `listingOwnershipApi.integration.test.js` exercises the production app and real PostgreSQL; existing admin API tests still exercise actual admin-only operations. | Complete |
| T034 | Existing `authApi`, AuthContext, ProtectedRoute and account/auth pages now implement real session establishment, revalidation and local logout; no duplicate auth/client system. | Complete |
| T031 | `frontend/e2e/auth-session.spec.js` runs real Chromium, Vite, Express and PostgreSQL and verifies logout/session recovery and actual browser-process reopen. | Complete |

The available `origin/MinhKhang24120336` listing code was inspected read-only:
it contains public approved-listing pagination only, without edit/delete. No ref
was merged. UC-17 defines permanent deletion and relation cleanup clearly, so the
minimum authorized integration implements deletion, not an invented mutation probe
or authorization-only response. The
[contract](./contracts/listing-ownership-api.md) was written before implementation.
There is no listing edit/create/read UI, search, maps, moderation or upload added.
Existing public-route behavior is not made private. The listing feature's full
UC-15/UC-17 UI and other CRUD remain separate work.

### Mutation and persistence evidence

The real DELETE responds `200 { success: true, data: { id: "123", deleted: true } }`.
Only a current active landlord owner succeeds; admin has no ownership override.
The strict empty body accepts no owner/role/userId field. Errors reveal no private
listing data. IDs remain exact BIGINT strings; SQL values are parameterized.

After middleware, a transaction locks the actor row and checks existence, status
and landlord role again, then locks/compares the listing owner. DELETE additionally
uses `WHERE id = $1 AND owner_id = $2 RETURNING id`. Existing foreign-key cascades
remove images, amenity links, nearby places and favorites atomically, preserving
shared amenities and accounts. Any failure rolls back and releases; rollback
failure discards the client while retaining the original error.

Thirty real-API cases cover guest/invalid/expired tokens; tenant, landlord owner,
landlord nonowner, admin owner/nonowner; deleted/inactive/role-changed accounts;
missing/invalid/out-of-range/BIGINT resource IDs; spoofed body/query fields; strict
payloads; duplicate deletion; and all relation persistence on success/denial.
Scheduling hooks change actual PostgreSQL owner/role/status/account/resource rows
after middleware and before checkout to prove transactional revalidation. A real
division-by-zero SQL failure after DELETE verifies rollback of every cascade.
Four service unit regressions separately verify commit/checkout/empty-delete and
broken-rollback connection handling. The old harnesses remain narrow guard tests;
they are not substituted for these production-route cases.

### Browser behavior and executed cases

`authApi` now reads the backend envelope, preserves error codes, sends Bearer
credentials only for authenticated calls and rejects incomplete profiles/sessions.
Mock/default login and registration were removed. API URL defaults to `/api/v1`;
Vite's proxy target defaults to port 3000 and is configurable through process
`API_PROXY_TARGET`. Production needs a same-origin API proxy or explicitly
configured `VITE_API_BASE_URL` and deployment CORS policy.

AuthContext stores only a token: standard/registration in sessionStorage,
remembered login in localStorage. New sessions clear older credentials in both
stores and legacy user caches. Reload shows checking UI until real `/auth/me`
returns the current profile. Invalid/deleted/expired or inactive sessions clear
credential/state and show recovery guidance. Network/server/ordinary FORBIDDEN
errors retain the credential, hide unverified content and offer retry.

Logout clears both stores and private state immediately, unmounts account content,
aborts checks and invalidates their generation before calling public logout.
Network acknowledgement failure cannot retain login; late /me results cannot
restore it. A pageshow handler re-reads storage on back/forward-cache restoration.
No token revocation was added; the browser test separately verifies a copied valid
JWT still works after local logout.

Nineteen browser cases actually passed on **Chromium headless**, including:

- Standard login/storage cleanup and authenticated reload via real `/me`.
- Remember me, closing Chromium entirely and relaunching a new process using the
  same temporary persistent disk profile, followed by real `/me`; no storageState.
- Both-store logout cleanup, Back to a real protected-document history entry,
  reload/direct navigation denial and no token on subsequent app requests.
- Logout acknowledgement network failure and pending real upstream `/me` response.
- Invalid/expired tokens and actual DB inactive/deleted account recovery.
- Real wrong-password rejection; injected network/500/incomplete response failures
  without fabricated sessions; retry on network/ordinary 403 without token deletion.
- Current DB role refresh, forged cached-user rejection, real UI registration.
- Keyboard login/logout and account width checks at 320 and 1280 CSS pixels.

Normal flows use real UI/API/DB. Browser interception deliberately injects only
network/server/malformed-response faults or delays a real upstream response.
This does not certify Firefox/WebKit, manual headed interaction, OS crash recovery,
or that a specific Back navigation used BFCache rather than a document reload.
The reopen case does exercise actual browser-process lifecycle.

### Tooling, commands and final results

Only `@playwright/test` 1.64.1 (Node.js 20+) was added, with its locked transitive
packages. Existing runtime dependency versions are unchanged. Chromium was
installed to the user's normal Playwright cache. No prior E2E framework existed.
Frontend has no lint or component/unit script; no such PASS is claimed.

From `backend/`:

```powershell
npx.cmd jest --config jest.unit.config.js --runInBand --silent
npm.cmd test -- --silent --json --outputFile "$env:TEMP/roomify-ownership-browser-backend-final.json"
npm.cmd run lint
```

From `frontend/`, **after** backend DB tests finish:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
```

Run `git diff --check` from the repo root. Do not run backend DB reset tests and
E2E simultaneously: current runs share the separate disposable Roomify-Test
Supabase project and its coordination lock.
Playwright starts isolated backend/Vite servers on 127.0.0.1:4310/5175 and refuses
existing servers. Both setup and fixture helpers guard the test target before
migration/mutation. E2E cleans only its own synthetic users; no truncate/reset.
Artifacts go to `%TEMP%/roomify-auth-e2e-results`; traces/screenshots/video are off.
Temporary persistent profiles are removed after the browser closes.

| Check | Actual final result |
|---|---|
| Independent backend unit config | 415 passed / 11 suites, zero failed/skipped |
| Full backend with real PostgreSQL | 618 passed / 18 suites, zero failed/skipped; all 584 earlier cases retained |
| Browser E2E | 19 passed, zero failed/skipped, retries disabled |
| Frontend production build | Exit 0, Vite built 40 modules |
| Backend lint | Exit 0, zero errors, the same two existing unused-disable warnings |
| `git diff --check` | Exit 0 |
| `npm.cmd audit --json` in frontend | Exit 1: four dependency entries, three moderate/one high, in the existing Vite/esbuild/React Router tree; separate upgrade review needed |

Initial listing tests failed before the route existed. A new DB-fault test's pg
interceptor initially lost callback arguments and hung; preserving callback-style
calls fixed it without timeout increases. Initial E2E email selectors matched a
paragraph incorrectly; they now assert the complete exact Email field. The first
Back test reached about:blank because login/logout replace history; it now creates
a genuine protected-document history entry. Final runs have no skips/retries or
relaxed production assertions. No major dependency upgrade was attempted.

### Review handoff and remaining boundaries

T025/T027/T031/T034 are now checked; F001–F003 and T049 remain unchecked by explicit
instruction. FR-019 controlled development/demo admin seed remains absent, and
test fixtures are not provisioning. A separate T049 review should consider this
new DELETE transaction and cascade semantics, token storage/script protection,
back/late-response handling, deployment proxy/CORS, dependency advisories, broader
permission-matrix integrations and controlled seed requirements. Human/peer review
and frontend-owner approval are still pending.

Existing T046–T048 fixes (safe logs/errors, guarded test migration, dummy bcrypt)
were preserved and their tests rerun. Audit migration remains test-only; development
`nhatro`, Docker image/volume and local `.env` were not modified. No admin seed,
server-side JWT revocation, frontend admin dashboard or listing UI was introduced.
No staging, commit, push, merge, reset, restore or clean was performed.

### Files changed in this continuation

Existing paths modified here (earlier pending work in other paths is retained):

```text
.gitignore
README.md
backend/jest.unit.config.js
backend/src/app.js
frontend/README.md
frontend/package.json
frontend/package-lock.json
frontend/src/api/authApi.js
frontend/src/context/AuthContext.jsx
frontend/src/pages/DashboardPage.jsx
frontend/src/pages/LoginPage.jsx
frontend/src/pages/RegisterPage.jsx
frontend/src/routes/ProtectedRoute.jsx
frontend/src/styles.css
frontend/vite.config.js
src/specs/001-user-auth/contracts/auth-api.md
src/specs/001-user-auth/quickstart.md
src/specs/001-user-auth/tasks.md
```

New paths added here:

```text
backend/src/controllers/listingController.js
backend/src/routes/listingRoutes.js
backend/src/services/listingService.js
backend/tests/listingOwnershipApi.integration.test.js
backend/tests/listingService.test.js
frontend/e2e/auth-session.spec.js
frontend/e2e/server.cjs
frontend/e2e/testDatabase.cjs
frontend/playwright.config.js
src/specs/001-user-auth/contracts/listing-ownership-api.md
```

The entire pending working tree now has 26 modified tracked paths and 32 untracked
paths (58 total), with no staged/deleted/renamed paths. This includes the earlier
feature implementation, not only the 28 paths above. Local `.env`, the signing key,
dependency installations, build output and browser/test artifacts are excluded.

## Cross-tab logout finding

Scope: explicit Sign Out across already-open Roomify tabs in one browser/origin.
The prior implementation cleared only the initiating tab's token ref/state; a
second tab could keep displaying its account and sending its in-memory credential.
Two real same-context Chromium tests reproduced that failure for remembered and
standard sessions before this fix. No backend revocation behavior was changed.

`AuthContext` now attempts both BroadcastChannel (`roomify-auth`) and a native
localStorage event marker (`roomify-auth-logout`). A message contains only an event
nonce and, on the channel, `type: logout`; it includes no token, password, email or
profile. Both paths deliver the same nonce, deduplicated through a bounded set.
The marker is not read during mount, so an old persisted value is not replayed;
remove events and ordinary token/cache writes during establish are ignored.
Independent login/register never broadcast or synchronize a new account.

The initiating tab calls existing `endSession`, publishes the event and makes one
public API acknowledgement. Receivers only call `endSession`: generation advances,
managed auth requests abort, token ref/accessible storage/legacy cache/account
state clear and protected content unmounts. Receivers neither publish nor call
logout, preventing loops and repeated acknowledgements. Pending `/me`, login and
register results cannot establish a session afterward. Existing pageshow handling
is retained. Channel/listener setup and cleanup run in the React.StrictMode
lifecycle; closed channels and storage listeners are removed on cleanup.

Either transport can deliver if the other is blocked. If all communication paths
are blocked, remote delivery is not guaranteed, but local in-memory logout still
works. Storage denied by browser policy cannot be physically cleared/inspected
until access is restored. Already-sent requests cannot be recalled; the guarantee
is local state invalidation and no new app requests using the cleared credential.
JWT copies may remain valid until expiry/current-DB rejection; other devices,
origins, frozen/discarded tabs and non-Chromium browsers are not certified here.

Nine added browser cases use two pages in the **same** browser context, sharing
origin/localStorage, with real API login and PostgreSQL on guarded `nhatro_test`.
No synthetic window event stands in for cross-tab delivery.

| Case | Verified behavior |
|---|---|
| Remembered session | A logs in, B restores via real `/me`; A logout clears both tabs without a receiver reload/action. Both stores/cache/state clear. |
| Standard session | Both tabs log in via UI into independent sessionStorage; logout reaches and clears the peer. A second login did not spuriously log out A. |
| Post-logout navigation/requests (both modes) | B's Back/reload/direct navigation stay signed out; subsequent app login sends no Bearer. Exactly one logout acknowledgement and one signal per delivery path, with no receiver rebroadcast. |
| BroadcastChannel unavailable | Real native storage events deliver logout; stale/remove markers and ordinary login token writes do not log out or switch the peer. |
| BroadcastChannel postMessage throws | Same fallback checks pass without a working channel sender. |
| Storage marker setItem throws | Real BroadcastChannel still delivers to the other tab. |
| Both transports blocked, localStorage getter denied | Initiating tab still clears accessible sessionStorage/in-memory state and shows login. Peer delivery is correctly not claimed. |
| Pending real `/me` | Remote logout wins before releasing the held upstream response; state stays signed out. |
| Pending real login / register | HTTP 200/201 is held before browser delivery; remote logout aborts the pending submit before release, then no token/account is restored. Registration's already-created account is cleaned as a test fixture, not rolled back by logout. |

The full browser regression retains all previous 19 cases, including actual
browser-process reopen, invalid/expired/deleted/inactive recovery, network failure,
normal registration, logout network failure and keyboard/viewport checks.
Fault branches deliberately disable browser APIs or hold real upstream responses;
they do not replace normal authentication/database evidence.

Commands from `frontend/`:

```powershell
npm.cmd run test:e2e -- --grep "cross-tab logout"
npm.cmd run test:e2e
npm.cmd run build
```

Final cross-tab fix verification on 2026-11-05: focused suite **9 passed**;
full browser suite **28 passed**, zero failures/skips and no retries; frontend
production build exit 0 (40 modules); repository `git diff --check` exit 0.

Run `git diff --check` from the repo root. Backend source/tests/dependencies and
task markers are unchanged; no backend regression rerun is required or claimed
for this frontend-only fix. No `.env`, development data, Docker image/volume,
dependency, 413 handling, admin seed or admin UI was changed. T049 stays unchecked.
No staging, commit, push, merge, reset, restore or clean was performed.

Files changed only in this fix: `frontend/src/context/AuthContext.jsx`,
`frontend/e2e/auth-session.spec.js`, `frontend/README.md`, root `README.md`,
`contracts/auth-api.md` and this quickstart. No new files or dependencies were added.
