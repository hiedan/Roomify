# Roomify browser authentication

React 18 + Vite reuse the existing API client, AuthContext and protected account
view. The T031/T034 continuation removes mock authentication and connects these
modules to the production backend contract.

Verification counts below are historical milestones from before the Supabase
migration, not new hosted-database test results. The current connection and test
isolation instructions use the separate Roomify and Roomify-Test projects.

## Local development

Install backend dependencies and configure the Roomify and Roomify-Test Supabase
projects first (see the root README). The databases are hosted; running the
frontend locally does not require Docker or a local PostgreSQL server.
From this folder run `npm.cmd ci`, then `npm.cmd run dev`. The browser uses
`/api/v1`; Vite proxies that prefix to `http://127.0.0.1:3000`. Override the proxy
with process environment `API_PROXY_TARGET`. An optional `VITE_API_BASE_URL` is a
public build-time URL, never a signing secret. In deployment prefer a same-origin
API reverse proxy; a cross-origin API additionally needs a deployment CORS policy.
No existing `.env` was changed and no JWT secret is bundled into this frontend.

The client unwraps `{ success, data }` / `{ success: false, error }` and rejects
missing session/profile fields instead of inventing a user. Profiles contain only
the five safe contract fields. No default user, mock token or password is stored.

## Session behavior

- Normal login and registration store only the token in sessionStorage; Remember
  me login stores it in localStorage. Establishing a new session clears both older
  credentials and legacy cached users first. Registration remains a 1h session.
- AuthContext restores identity only after `/auth/me` succeeds. Checking/retry
  screens hide protected account content. `UNAUTHORIZED` and `INACTIVE_ACCOUNT`
  clear the session with sign-in/contact-admin guidance. Ordinary `FORBIDDEN` and
  temporary network/server failures preserve the credential and offer retry.
- Logout clears both storage locations and in-memory account state immediately,
  unmounts private content, cancels outstanding checks and invalidates their result
  generation. Its public server acknowledgement can fail without retaining login.
  Back/forward-cache restoration re-reads browser credentials before restoring a
  session. A copied JWT is still valid until expiry subject to current DB checks.
- Explicit Sign Out also ends sessions in other open Roomify tabs in the same
  browser/origin. BroadcastChannel and a localStorage event marker carry only a
  non-sensitive nonce; receivers deduplicate delivery, run the existing teardown,
  and never rebroadcast or call logout. Token cleanup during login/register is
  not a logout event. Old markers are not read on mount; remove events are ignored.
  Either transport can work when the other is blocked. If both are unavailable,
  only local teardown is guaranteed; inaccessible storage cannot be physically
  cleared until access is permitted. Already-sent requests cannot be recalled.
- Login/register provide loading/error feedback, prevent repeated submit, label
  inputs and support keyboard use. Unsupported recovery/social controls are
  explicitly disabled.

## Prototype-based UI

The existing screens follow the references in
`docs/PA3 - use-case specification/images`: UC-01/02 authentication cards,
UC-04 account dropdown, UC-05 profile styling, and UC-15/22 portal navigation.
The UI uses Vietnamese labels, light backgrounds, white bordered cards, blue
actions and local SVG icons, with layouts for narrow and desktop viewports.

- `/login` retains Remember me and adds a password visibility toggle.
- `/register` validates password confirmation locally; only `fullName`, `email`
  and `password` are submitted. Public registration still creates a tenant.
  There is no role selector on the registration form.
- `/dashboard` shows the current backend profile, account refresh and logout.
  The avatar dropdown supports keyboard dismissal and outside-click dismissal.
  Profile editing and avatar uploads are not available.
- `/become-landlord` lets a tenant submit contact name, phone, proposed property
  address and an optional message. It displays pending/rejected status and permits
  a revised application after rejection. The dashboard includes the entry button.
- `/landlord` uses the listing portal layout with an explicit unavailable state;
  no sample listings or invented counts are presented as live data.
- `/admin` retains the real role/status update endpoints by target account ID.
  A native confirmation dialog previews both changes before submitting. Each
  operation's outcome is reported separately, including partial failures.
  User-list/search endpoints and public admin provisioning are not available.
  Its application queue now supports approving/rejecting landlord access, with a
  required rejection reason. The legacy role form also requires a pending
  application before granting landlord access.

Pending applications are checked every 10 seconds while visible and on window
focus. A changed server role triggers the existing `/auth/me` refresh so the
profile and landlord navigation update without replacing the stored token.
See [the application contract](../docs/analysis-and-design/landlord-access-requests.md).

The landlord-application checkpoint passed all 37 Chromium browser cases,
including real approval/rejection, resubmission, automatic profile updates and
the earlier session/cross-tab scenarios. The production build also passed.

The UI revision adds browser coverage for confirmation validation, password
visibility, dropdown keyboard/outside-click behavior, role-guarded portal layouts,
and actual admin lock/reopen operations. Admin tests use generated accounts only
in the dedicated Roomify-Test Supabase project; cleanup removes their audit references and accounts in a
transaction. The existing session and cross-tab logout coverage remains in place.

UI revision verification: all 34 Chromium cases passed, including 320px/1280px
portal and keyboard checks; the production build and `git diff --check` passed.
Desktop/mobile screenshots were also inspected with synthetic browser-only
profiles. These checks do not certify Firefox/WebKit or implement the remaining
prototype features.

## Browser tests and build

The added browser tooling requires Node.js 20+; this run used Node.js 24.

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
```

`@playwright/test` 1.64.1 is the sole added development-tool dependency; existing
runtime dependencies were not upgraded. There was no E2E framework or frontend
lint/unit script before this work. `test:e2e` is the browser test script; no lint
or component-test PASS is claimed. `npm audit` separately reports four existing
Vite/esbuild/React Router dependency entries (one high, three moderate), requiring
an independent upgrade review rather than an automatic major update here.

The Playwright config starts real backend/frontend servers on 127.0.0.1 ports
4310 and 5175, refusing to reuse an existing server. Backend setup and fixture
helpers validate `TEST_DATABASE_URL` and `TEST_SUPABASE_PROJECT_REF` against the
separate Roomify-Test Supabase project. `DATABASE_URL` and `SUPABASE_PROJECT_REF`
identify Roomify and must resolve to a different project; matching database names
such as `postgres` are allowed. Optional migration URLs must identify the same
project/database as their corresponding runtime URLs. TLS verifies certificates
and hostnames; configure a test CA with `TEST_DATABASE_CA_CERT` when needed.
Only Roomify-Test is migrated; E2E deletes only its generated synthetic accounts,
without truncate, reset, production seed or application-project writes. Backend
dependencies and a valid private signing key must be available. Keep connection
URLs and JWT secrets out of frontend `VITE_*` variables. Do not run backend
integration/reset tests concurrently with E2E; they share Roomify-Test and use an
advisory coordination lock.

The prior integration checkpoint passed 19 Chromium headless cases:
real login/register, storage selection, /me reload, role refresh, logout/back/direct
navigation, no subsequent app Authorization after logout, expiry/invalid/deleted/
inactive recovery, wrong password, pending /me cancellation, retry on network or
ordinary 403, and keyboard/width checks at 320 and 1280 CSS pixels. The remember-me
case actually closes and relaunches a persistent Chromium process with the same
temporary disk profile; it does not use storageState to simulate reopening.

The cross-tab fix adds nine real two-page/same-context cases: remembered and
standard logout, both transport fallback paths, unavailable transports/local
storage, and late `/me`, login and registration responses. The primary cases
verify both tabs' storage/state, Back/reload/direct navigation, no subsequent app
Bearer header, one signal per transport and one HTTP acknowledgement. Fallback
cases verify old/remove markers and normal independent login remain harmless.
Final cross-tab-fix verification passed all 28 cases, zero failures/skips/retries,
and the frontend production build. Backend files were unchanged and its suite was
not rerun in this fix. See the feature quickstart's cross-tab review record.

Network/server/malformed-response cases deliberately inject faults in the browser;
normal auth, role/status changes, deletion and expiry checks use the real API and
PostgreSQL. The pending /me case delays a real upstream response. This evidence
covers Chromium headless only, not Firefox/WebKit, manual headed verification,
OS crash/session recovery or full frontend-owner acceptance. F001?F003 and T049
remain unchecked as requested. FR-019 controlled admin provisioning is still absent.

Artifacts are outside the repo under the system temporary directory
`roomify-auth-e2e-results`; sensitive traces/screenshots/video are disabled.
Persistent test profiles are also temporary and removed after their browser closes.
