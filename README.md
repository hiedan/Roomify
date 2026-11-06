# Roomify

Roomify's implemented backend uses Node.js/CommonJS, Express 4 and Supabase PostgreSQL/PostGIS.
This handoff describes the current authentication/admin API and listing ownership
integration on branch `HIEN`; it
does not certify the whole feature or its browser/business integrations complete.
Human/peer review and user approval are pending.

Verification counts recorded in this handoff are historical checkpoints from
before the Supabase migration, not results of this documentation update. Use the
Supabase setup below for current database connections and verification runs.

## Backend layout

| Location | Responsibility |
|---|---|
| `backend/src/app.js`, `server.js` | Build the Express app and start the HTTP server |
| `backend/src/routes/` | Auth/admin routes and middleware order |
| `backend/src/controllers/` | Standard response envelope and Express 4 async error forwarding |
| `backend/src/services/authService.js` | Unchanged password policy, bcrypt and HS256 JWT primitives |
| `backend/src/services/authAccountService.js` | Strict input schemas, normalized email, transactional registration, login and safe profiles |
| `backend/src/services/adminService.js` | Locked actor/target revalidation, role/status changes and mandatory atomic audit |
| `backend/src/services/landlordRequestService.js` | Tenant applications, admin review and atomic landlord role grants |
| `backend/src/services/listingService.js` | Transactional UC-17 owner-only listing deletion and FK cascade cleanup |
| `backend/src/middlewares/auth.js` | Current-account authentication, explicit role policy and listing ownership predicate |
| `backend/src/middlewares/errorHandler.js` | Safe validation/application/system responses and non-sensitive error logging |
| `backend/src/config.js`, `databaseConfig.js`, `db.js`, `utils/` | Environment loading, Supabase project/TLS validation, PostgreSQL pool and safe ID/response/error helpers |
| `backend/scripts/` | Validated migration commands, read-only database inspection and schema/CHECK comparison |
| `backend/migrations/`, `tests/` | Versioned schema and unit/real PostgreSQL tests |

See the [API contract](src/specs/001-user-auth/contracts/auth-api.md),
[data model](src/specs/001-user-auth/data-model.md),
[ERD](docs/analysis-and-design/ERD_Roomify.mmd), and
[verification/review record](src/specs/001-user-auth/quickstart.md).

## Database and local environment

Prerequisites: Node.js 18+, npm, and access to two separate Supabase projects:
**Roomify** for the application and **Roomify-Test** for automated tests.
The frontend and backend run locally; their databases are hosted on Supabase.
Docker Desktop, Compose and a local PostgreSQL service are not required.
Commands below use PowerShell on Windows.

```powershell
cd backend
npm.cmd ci
if (!(Test-Path .env)) { New-Item -ItemType File -Path .env | Out-Null }
```

Configure `backend/.env` with your own private connection values without
overwriting an existing configuration. Use placeholder values in shared examples;
do not copy another developer's passwords or signing key.

| Variable | Required use |
|---|---|
| `DATABASE_URL` | Application PostgreSQL connection URL from the Roomify project's Connect settings |
| `SUPABASE_PROJECT_REF` | Roomify project reference matching `DATABASE_URL` |
| `TEST_DATABASE_URL` | PostgreSQL connection URL for the separate Roomify-Test project |
| `TEST_SUPABASE_PROJECT_REF` | Roomify-Test project reference matching `TEST_DATABASE_URL`; must differ from Roomify |
| `MIGRATION_DATABASE_URL` / `TEST_MIGRATION_DATABASE_URL` | Optional migration URLs; each must match its environment's runtime project and database |
| `DATABASE_CA_CERT` / `TEST_DATABASE_CA_CERT` | Optional PEM CA certificate paths when needed by the selected endpoint; paths resolve relative to `backend/` |
| `JWT_SECRET` | Private, randomly generated, non-placeholder string of at least 32 UTF-8 bytes |
| `PORT` | Optional HTTP port; default 3000 |

Generate a signing key locally using `crypto.randomBytes(32).toString('hex')`
(see the [key instructions](src/specs/001-user-auth/quickstart.md#jwt-signing-key-t004)).
Do not commit or share the output. The JWT service rejects the example placeholder
and config fallback; missing/unsafe keys fail with `500 AUTH_CONFIG_ERROR`.
Changing the signing key invalidates older tokens. `.env` is ignored by Git.

The backend uses `pg` with a Supabase **Direct** or **Session pooler** connection
on port 5432. Transaction pooler mode on port 6543 and connection-override URL
parameters are rejected. TLS verifies the certificate and endpoint hostname;
configured CA certificates supplement the system trust roots. Do not disable TLS
verification. Connection URLs, CA files and the JWT secret belong to the backend,
not frontend `VITE_*` variables. This setup uses the existing Express
authentication APIs, not Supabase Auth or a browser database connection.

Application tables and migration history use `public`; PostGIS is supported in
`public` or `extensions`. Both projects may use a database named `postgres`:
isolation is checked by project identity, not by different database names.

### Migration targets

Review the application and test project identities before applying migrations.
From `backend/`, use the scripts that validate configuration and schema history:

```powershell
npm.cmd run migrate
npm.cmd run db:check
npm.cmd run migrate:test
npm.cmd run db:check:test
```

Migrations remain versioned in `backend/migrations/`; existing applied files must
not be edited. The migration tooling checks schema/history before and after
applying pending migrations, and handles PostGIS initialization. `db:check` is a
read-only inspection of the selected database; it does not apply migrations.

Jest and browser setup migrate only the validated Roomify-Test project and hold
an advisory coordination lock. Missing identities, the same project for both
environments, or a runtime/migration project mismatch fail before test work.
Tests can reset **test data**; never point fixtures at Roomify or a project
containing data that must be retained. Do not run integration/reset tests and
E2E concurrently. Do not reset, truncate or run migration-down against Roomify.

Start the API after configuring/migrating the intended application project:

```powershell
npm.cmd run dev
```

`GET /api/v1/health` checks that the HTTP app responds. Use `npm.cmd run db:check`
to inspect the application's Supabase connection, TLS, schema history and PostGIS.

## Auth and admin API

The [landlord application flow](docs/analysis-and-design/landlord-access-requests.md)
adds a tenant form at `/become-landlord` and administrator review at
`/admin#landlord-requests`. New accounts remain tenants until admin approval.
Granting landlord access through the legacy role endpoint also requires and
approves a pending application. See the linked contract for the new endpoints.

All paths below are relative to `/api/v1`. JSON payloads reject unsupported fields.

| Method/path | Request | Successful response |
|---|---|---|
| POST `/auth/register` | `fullName`, `email`, `password`, optional boolean `rememberMe` | 201, `{ user, token, expiresIn: 3600 }` |
| POST `/auth/login` | `email`, `password`, optional boolean `rememberMe` | 200, `{ user, token, expiresIn }` |
| GET `/auth/me` | `Authorization: Bearer <token>` | 200, current safe profile from DB |
| POST `/auth/logout` | No valid session required | 200, `{ loggedOut: true }` |
| PATCH `/admin/users/:id/role` | `{ "role": "landlord" }` or `tenant` | 200, `{ user, changed }` |
| PATCH `/admin/users/:id/status` | `{ "isActive": false }` or true | 200, `{ user, changed }` |
| DELETE `/listings/:id` | Bearer token, no body or `{}` | 200, `{ id, deleted: true }`, active landlord owner only |

Success data is wrapped as `{ "success": true, "data": ... }`. Errors use
`{ "success": false, "error": { "code": "...", "message": "..." } }`.
Profiles contain only `id`, `fullName`, `email`, `role`, `isActive`; **ID is a
decimal string**, preserving PostgreSQL BIGINT precision. No profile includes
passwords/hashes/tokens. Session tokens are returned only by successful register/login.

Registration trims names to 2–100 UTF-16 code units and trims/lowercases syntactically
valid Gmail addresses up to 255 code units. Dots and plus-tags remain distinct.
Passwords are compared verbatim: at least 8 Unicode code points, at most 72 UTF-8
bytes, bcrypt cost 12, no trimming/lowercasing/truncation. Registration always
creates an active tenant and a one-hour session, including if its optional
`rememberMe` is true. Login defaults to one hour; `rememberMe: true` selects seven days.

Unknown-account/wrong-password login share `401 INVALID_CREDENTIALS`; unknown
accounts also perform a dummy cost-12 bcrypt comparison. Correct credentials for
inactive accounts return `403 INACTIVE_ACCOUNT`. Other principal errors are
400 `VALIDATION_ERROR`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`,
409 `EMAIL_CONFLICT`, and 500 `AUTH_CONFIG_ERROR`/`INTERNAL`.
Unexpected errors expose no raw DB detail, SQL, stack or credentials in responses
or application logs. Validation/404 messages do not echo rejected values/URLs.

Logout acknowledges ending the browser session; it does **not** revoke JWTs or
clear browser storage remotely. Client storage clearing/restoration remains a
separate integration responsibility. A copied valid token is usable until expiry,
subject to the account's current DB role/status on every protected request.

Admin routes require an active admin and a non-admin target. They cannot grant
admin or modify an admin target, including self-targets. `isActive` is a real JSON
boolean, not a string/number. Same-value requests return `changed: false` after
authorization, without UPDATE/audit. Actual changes lock actor/target in numeric
ID order, re-check authorization, and commit update + audit on one connection.
Disabling preserves identity/owned/history records and blocks login/old-token use;
enabling permits valid login and the same unexpired token again. No token is renewed.

## Applying the middleware

Use `requireAuth` before `requireRole(...roles)` or `requireAdmin`. Roles are
explicit: admin does not inherit landlord-only or tenant-only permissions.
`requireAuth` accepts only a Bearer header and loads current DB state; body/query
role, status and credentials never authorize access.

The listing pattern is `requireAuth`, `requireRole('landlord')`,
`requireOwnership`, then the owning feature's handler. Ownership reads
`req.params.id` and the stored `listings.owner_id`, never a client owner field.
The helper's read does not make a subsequent mutation atomic. A real mutation
must also constrain SQL by the authenticated owner or use a suitable transaction.
`DELETE /api/v1/listings/:id` now uses this chain and locks/revalidates the actor
and listing owner inside a transaction before a conditional owner-constrained
DELETE. Existing FK cascades remove listing relations atomically. See the
[minimal UC-17 contract](src/specs/001-user-auth/contracts/listing-ownership-api.md).
The old policy harnesses remain separate from the new production-route evidence.
Listing edit/create/read UI and other CRUD remain outside this handoff.

## Browser session integration

The existing React/Vite frontend now calls the real backend, without mock sign-in
or default profiles. Run `npm.cmd ci` and `npm.cmd run dev` from `frontend/`.
The API client defaults to `/api/v1`; Vite proxies it to `http://127.0.0.1:3000`.
Set process variable `API_PROXY_TARGET` for a different local backend. Deployment
must serve/proxy `/api/v1` on the frontend origin, or configure `VITE_API_BASE_URL`
with an appropriate deployment CORS policy. No local `.env` was changed.

Standard sessions use sessionStorage, remembered login uses localStorage; a new
session clears the other store and legacy cached users. Reload verifies `/auth/me`
before showing account data. Transient failures and ordinary `FORBIDDEN` retain
the credential and show retry; `UNAUTHORIZED`/`INACTIVE_ACCOUNT` clear it. Logout
immediately clears both stores/state, aborts pending session checks and ignores
stale responses, even when its server acknowledgement fails. Back/forward-cache
restoration re-reads storage. No server-side token revocation was added.

Explicit Sign Out also notifies other open same-origin Roomify tabs using
BroadcastChannel plus a storage-event fallback. Receivers clear their own
credential/state and invalidate pending auth responses without rebroadcasting or
calling logout again. Messages contain no credential/profile data. If neither
transport works, only local logout is guaranteed; see the frontend README.
The cross-tab-fix run passed 28 Chromium browser cases and the production build;
backend files were unchanged and its suite was not rerun for that fix.

Browser verification from `frontend/`:

The added browser tooling requires Node.js 20+ (verified here with Node.js 24).

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
```

Playwright is the only new tooling dependency. E2E starts isolated servers on
4310/5175 and refuses fixture targets outside the validated Roomify-Test project;
run it separately from the
backend integration suite. It cleans only its synthetic accounts, never resets
development, and puts artifacts/profiles in the temporary directory. The latest
integration checkpoint passed 19 Chromium headless cases, including actual browser-process close and
reopen with a disk profile (no storageState simulation). This is not evidence for
other browsers or manual headed UI review. See [frontend setup](frontend/README.md).

## Admin provisioning and outstanding scope

**FR-019 controlled development/demo admin seed is missing.** There is no supported
seed/provisioning command in the repository. Admin rows created by integration
fixtures are temporary test data, not a development provisioning tool. Public
registration cannot create admins; no default administrator credential is supplied.

Minimum proposed follow-up: a local-only, development/demo-gated seed that reads
an explicitly supplied name/Gmail/password through protected input, uses the
existing password validator/hash helper, and creates the initial admin in a
transaction. It must reject production/ambiguous targets and existing conflicting
accounts, have no default password or HTTP registration route, and never print
credentials. This proposal is **not implemented** and needs user/team review.

T025/T027 now have production DELETE-route/PostgreSQL evidence and T031/T034
have real browser session/logout evidence. F001–F003 remain unchecked as requested
for frontend-owner verification. The final security gate T049 remains open for a
separate review, including the provisioning gap and broader protected flows. Admin
UI from the full specification is outside this backend handoff. No whole-feature
completion, user review or peer approval is claimed.

## Verification and review handoff

From `backend/`:

```powershell
npx.cmd jest --config jest.unit.config.js --runInBand --silent
npm.cmd test -- --testTimeout=30000 --silent --json --outputFile "$env:TEMP/roomify-t046-t049-final-results.json"
npm.cmd run lint
```

Run `git diff --check` at the repository root. Unit tests need no PostgreSQL;
the full suite uses real Supabase PostgreSQL/PostGIS on Roomify-Test. Test reports belong
in a temporary directory, not the commit. The latest verified results, findings,
pending security sign-off and exact modified/untracked commit inventory are kept
in the existing [quickstart integration record](src/specs/001-user-auth/quickstart.md#t025-t027-t031-t034-integration-handoff).
At the listing/browser integration checkpoint the results were 415 unit tests/11 suites and 618 full
backend tests/18 suites, zero failures/skips, plus 19 browser cases. Backend lint
has zero errors and the same two existing warnings. Frontend has no lint script.
`npm audit` separately reports four existing Vite/esbuild/React Router dependency
entries (one high, three moderate); major upgrades were not attempted. Dependency
review remains part of the T049 handoff.
No staging, commit, merge or push is performed by these verification commands.
