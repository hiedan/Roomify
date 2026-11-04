# Backend Authentication Setup
Performed by: Codex (AI-assisted preparation for Đặng Hiển) | Reviewed by: Pending | Edited by: Codex

## Current implementation and file map (B001)
Performed by: Codex | Reviewed by: Pending | Edited by: Codex

The baseline is `develop` commit `0a120d704f9c712270294134c4ad4265855c9110`.
Đặng Hiển is Person A (backend/database). Person B owns frontend integration.
This setup increment covers B001–B003; it does not implement authentication.

| File or directory | Existing behavior | Upcoming auth work |
| --- | --- | --- |
| `src/app.js` | JSON parsing, health endpoint, shared errors | Mount `authRoutes` before `notFound` (T008/T015) |
| `src/config.js` | Port, environment-selected DB URL, JWT configuration | Use standard 1h and remembered 7d sessions; fail safely for missing signing configuration (T004/T019) |
| `src/db.js` | Shared PostgreSQL pool and parameterized query helper | Persist accounts and reload current role/status |
| `migrations/1700000000000_init.js` | Seven tables, PostGIS, `users` role/status fields | Add versioned migrations if normalization/audit constraints need changes (T009/T036/T040) |
| `src/services/` | No service implementation | Add `authService.js` for hashing, verification and JWTs (T004) |
| `src/middlewares/` | Error handling only | Add `auth.js` for identity, role and ownership checks (T005/T006/T026) |
| `src/controllers/` | No controllers | Add `authController.js`, then `adminController.js` |
| `src/routes/` | No feature routes | Add auth and admin routes |
| `src/utils/` | `AppError` and response helpers | Preserve `{ success, data }` / `{ success, error }` envelopes |
| `tests/app.test.js` | Health, 404 and malformed JSON tests | Preserve existing behavior |
| `tests/db.test.js` | Schema, seed and role-constraint tests | Extend DB verification for auth |
| `tests/auth.test.js` | Not created yet | Registration, login, session, role/status and ownership tests |

The existing schema uses lowercase table names and the role value `tenant`.
Follow these established contracts for this increment; any naming migration must
be coordinated rather than renaming tables during authentication setup.

## Dependencies (B002)
Performed by: Codex | Reviewed by: Pending | Edited by: Codex

`bcryptjs` and `jsonwebtoken` are declared in `package.json` and locked in
`package-lock.json`. Install the reproducible dependency set with `npm ci`.
Adding these dependencies does not mean password hashing or JWT authentication
is already implemented.

## Developer environment (B003)
Performed by: Codex | Reviewed by: Pending | Edited by: Codex

From the repository root:

```bash
docker compose up -d db
cd backend
cp .env.example .env
npm ci
npm run migrate
npm run dev
```

Wait until PostgreSQL is ready before running migrations. The container requires
PostGIS, not just a plain PostgreSQL server. `docker/init.sql` creates
`nhatro_test` only when the Docker volume is initialized for the first time.
For an existing volume missing the test database, create it without removing data:

```bash
docker compose exec db psql -U postgres -d postgres -c "CREATE DATABASE nhatro_test;"
```

Run that command from the repository root and only if the database is absent.

| Variable | Development example | Use |
| --- | --- | --- |
| `PORT` | `3000` | Express HTTP port |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/nhatro` | Development app and `npm run migrate` |
| `TEST_DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/nhatro_test` | Jest queries and automatic test migrations |
| `JWT_SECRET` | Set a private local value | Planned JWT signing; do not commit the real value |
| `NODE_ENV` | `test` during Jest | Selects `TEST_DATABASE_URL`; Jest sets this automatically |

The credentials above match the local Docker development service only. Generate
a local signing secret with `node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"`
and paste it into your ignored `.env`. Do not use the example `change-me` value
for authentication. T004 must remove the existing unsafe production fallback.

Run backend commands inside `backend/`: dotenv and migration paths currently
depend on that working directory. `DATABASE_URL` and `TEST_DATABASE_URL` must
point to different databases. `tests/helpers.js` truncates data, so never use a
development or production database as the test target. Current configuration
selects the URL but does not enforce this separation for you.

Verify the scaffold:

```bash
curl http://localhost:3000/api/v1/health
npm run lint
npm test
```

The health response should be `{"success":true,"data":{"status":"ok"}}`.
`npm test` first migrates the test database and then runs the API/DB tests;
connection or PostGIS failures are setup failures, not a passing auth suite.

## Integration checkpoint and next work
Performed by: Codex | Reviewed by: Pending | Edited by: Codex

Next: T004–T009, followed by registration tests T010/T011 and implementation
T012–T016. Agree on `src/specs/001-user-auth/contracts/auth-api.md` with Person B
before connecting the UI. The baseline has these unresolved integration gaps:

- Frontend calls port 5000; backend defaults to 3000. Choose a shared API base
  or Vite proxy and configure browser cross-origin access as appropriate.
- Success responses are enveloped under `data`; the pages currently read
  `response.user`. Error messages are under `error.message`.
- Remove mock-success fallbacks when connecting real auth. Failed requests must
  not create a signed-in browser state.
- Persist and send the real bearer token. Restore through `/auth/me`, and clear
  both session/local storage on logout. Current frontend stores only a user object.
- Existing `jwtExpiresIn` is always 7d. T004/T019 must implement the agreed 1h/7d
  behavior and safe signing-configuration validation before issuing sessions.
- `spec.md` FR-022 requires atomic audit records for role/status changes, while
  tasks T036/T040 describe logging as optional. Reconcile before admin work.
- The current UC-01 allows self-selected roles and social auth; the auth spec
  instead limits public registration to tenant accounts and excludes OAuth.
  Reconcile the PA3 use-case scope before claiming acceptance.
