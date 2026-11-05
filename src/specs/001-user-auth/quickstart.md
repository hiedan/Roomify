# Quickstart: Auth Verification

## Prerequisites

- Node.js 18+
- PostgreSQL database with the `nhatro` and `nhatro_test` databases available
- Environment variables set for `DATABASE_URL` and `TEST_DATABASE_URL`
- `backend/` dependency installation complete
- Optional frontend setup for UI verification: `frontend/` dependency installation complete

## Setup

```bash
cd backend
npm install

cd ../frontend
npm install
```

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

T004 unit tests and lint run from `backend/` without PostgreSQL:

```bash
cd backend
npx jest --config jest.unit.config.js --runInBand
npm run lint
```

The existing integration suite requires PostgreSQL and retains its migration setup:

```bash
cd backend
npm test -- --runInBand
```

For frontend UI verification in a separate terminal:

```bash
cd frontend
npm run dev
```

For focused auth checks, add or run only the auth-related tests once they are implemented:

```bash
npx jest tests/auth.test.js --runInBand
```

## Suggested end-to-end verification scenarios

1. Register a valid tenant account with a new Gmail address.
2. Attempt duplicate registration with the same normalized email and confirm the conflict response.
3. Sign in with the correct password and verify the returned profile and session token.
4. Sign in with the wrong password and an inactive account to confirm both fail with the same invalid-credentials flow.
5. Call a protected route as guest, tenant, landlord, and admin to verify role enforcement.
6. Disable a non-admin account and confirm the next login attempt is rejected.
7. Re-enable the account and verify login works again.
8. Update a user's role by admin and verify the new permissions take effect on the next protected request.

## Expected outcomes

- Public registration only creates tenant accounts.
- Normalized emails are unique and case-insensitive.
- Invalid sessions are cleared and the user is returned to sign-in.
- Role and status checks are enforced on the server, not the browser.
