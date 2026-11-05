# Auth API Contract

## Shared error presentation

Errors retain the HTTP statuses and codes below in the standard
`{ success: false, error: { code, message } }` envelope. Malformed JSON and schema
errors return `400 VALIDATION_ERROR`; unsupported keys and rejected enum values
are not echoed. An unmatched route returns a fixed `404 NOT_FOUND` message without
reflecting its URL. Unexpected server failures return a generic `500 INTERNAL`;
the central handler logs only a fixed event message, without the raw error,
SQL, connection string, stack, request body, hash or token. Trusted `AppError`
messages remain specific to the documented failure. These presentation safeguards
do not reclassify database or JWT configuration failures as credential errors.

## Authentication endpoints

### POST /api/v1/auth/register

**Purpose**: Create a new tenant account.

**Request body**

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "  NGUYEN.A@GMAIL.COM  ",
  "password": "StrongPass!123",
  "rememberMe": false
}
```

**Success response (201)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123",
      "fullName": "Nguyễn Văn A",
      "email": "nguyen.a@gmail.com",
      "role": "tenant",
      "isActive": true
    },
    "token": "jwt-token",
    "expiresIn": 3600
  }
}
```

**Error responses**
- `VALIDATION_ERROR` for bad input
- `EMAIL_CONFLICT` when email already exists after normalization

Only `fullName`, `email`, `password`, and optional boolean `rememberMe` are
accepted. Names are trimmed to 2–100 UTF-16 code units. Emails are trimmed,
lowercased, valid Gmail addresses of at most 255 code units. Passwords use T004's
unchanged policy: at least 8 characters and at most 72 UTF-8 bytes, without
normalization. Unknown fields, including `role`, `is_active`, and `isActive`,
are rejected with `400 VALIDATION_ERROR`.

Registration always establishes the standard one-hour session, including when
`rememberMe: true` is supplied; remember-me changes the lifetime only for login.
The account is inserted as an active tenant. Token issuance occurs before the
transaction commits; signing/configuration failure rolls back the inserted row.
The normalized email is protected by the existing `users_email_key` constraint:
concurrent duplicate inserts produce `409 EMAIL_CONFLICT`. Unexpected database
errors retain their central error-handler behavior.

### POST /api/v1/auth/login

**Purpose**: Authenticate an existing user.

**Request body**

```json
{
  "email": "user@gmail.com",
  "password": "StrongPass!123",
  "rememberMe": true
}
```

**Success response**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123",
      "fullName": "Nguyễn Văn A",
      "email": "user@gmail.com",
      "role": "landlord",
      "isActive": true
    },
    "token": "jwt-token",
    "expiresIn": 604800
  }
}
```

**Error responses**
- `INVALID_CREDENTIALS` for unknown users or wrong password
- `INACTIVE_ACCOUNT` when the user exists but is disabled

Login accepts only `email`, `password`, and optional boolean `rememberMe`
(default `false`), using the same email/password validation as registration.
Unknown accounts and incorrect passwords return identical
`401 INVALID_CREDENTIALS` responses. An inactive account returns
`403 INACTIVE_ACCOUNT` only after its password is verified. JWT configuration
errors return `500 AUTH_CONFIG_ERROR`; unexpected database failures are not
converted into credential errors.

### GET /api/v1/auth/me

**Purpose**: Retrieve the current signed-in user from the server.

**Headers**

```http
Authorization: Bearer <jwt>
```

**Success response**

```json
{
  "success": true,
  "data": {
    "id": "123",
    "fullName": "Nguyễn Văn A",
    "email": "nguyen.a@gmail.com",
    "role": "tenant",
    "isActive": true
  }
}
```

**Error responses**
- `UNAUTHORIZED` for missing/invalid token
- `INACTIVE_ACCOUNT` for disabled accounts

### POST /api/v1/auth/logout

**Purpose**: Acknowledge ending the current browser session. The client must clear
both browser storage locations and its in-memory account state.

This endpoint is public and idempotent, so logout also works when a credential
is missing or expired. It does not revoke JWTs, mutate an account, or clear
browser storage remotely. A copied valid token remains subject to expiration
and the current account checks on protected endpoints.

Explicit browser Sign Out notifies other already-open Roomify tabs on the same
origin through BroadcastChannel and a localStorage logout marker. The message
contains only a non-sensitive event nonce (plus the channel event type), never
credentials/profile data. A receiving tab runs local teardown, invalidating
pending session/login/register results, without broadcasting or calling this
endpoint again. Delivery on both paths is deduplicated. Old stored markers and
remove events do not end a new session; ordinary token writes/removals do not
signal logout. If both transports are unavailable, cross-tab delivery is not
guaranteed, while local in-memory logout still works. This neither revokes JWTs
nor recalls requests already sent, and does not synchronize new logins/accounts.

**Success response**

```json
{
  "success": true,
  "data": { "loggedOut": true }
}
```

## Admin endpoints

### PATCH /api/v1/admin/users/:id/role

**Purpose**: Change a non-admin user's role.

**Request body**

```json
{
  "role": "landlord"
}
```

**Restrictions**
- Only active admin users can invoke this route.
- `admin` -> `tenant/landlord` and `tenant` -> `admin` are not allowed.
- Unsupported roles are rejected.

The strict body accepts only `role`, with the exact value `tenant` or `landlord`.
An attempted administrator grant is `400 VALIDATION_ERROR`. Any admin target,
including the requesting admin, is `403 FORBIDDEN`; no-op values do not bypass
that restriction. Target IDs must be canonical positive decimal strings within
PostgreSQL BIGINT range.

### PATCH /api/v1/admin/users/:id/status

**Purpose**: Disable or re-enable a non-admin account.

**Request body**

```json
{
  "isActive": false
}
```

**Restrictions**
- Only active admin users can call it.
- Admin target accounts cannot be deactivated through this flow.

The strict body accepts only `isActive`, and it must be a JSON boolean. Strings
such as `"false"`, numbers, null, missing values and extra fields are
`400 VALIDATION_ERROR`. Admin targets cannot be changed or submitted as no-ops
through this endpoint, including re-enabling an admin already marked active.

### Shared admin response, errors, audit and concurrency

Both PATCH endpoints return `200` using the standard envelope:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "456",
      "fullName": "Synthetic User",
      "email": "synthetic@gmail.com",
      "role": "landlord",
      "isActive": true
    },
    "changed": true
  }
}
```

`user` is the updated safe DB profile. Role changes preserve activity status;
status changes preserve role, identity and all owned/history records. No password,
hash, token, renewed session, or audit contents are returned. A request for the
stored value returns the same shape with `changed: false`, without UPDATE or
audit INSERT. Authorization and target restrictions are still enforced.

| Condition | Status / error code |
|---|---|
| Missing/invalid/expired session, or actor deleted before the transactional recheck | `401 UNAUTHORIZED` |
| Inactive actor | `403 INACTIVE_ACCOUNT` |
| Authenticated non-admin actor, or any admin target/self-target | `403 FORBIDDEN` |
| Invalid/out-of-range target ID, malformed/strict-payload failure, unsupported role or non-boolean status | `400 VALIDATION_ERROR` |
| Missing management target | `404 NOT_FOUND` |
| JWT signing configuration failure | `500 AUTH_CONFIG_ERROR` |
| Unexpected DB, mutation, audit or transaction failure | `500 INTERNAL` with a generic public message |

Routes compose existing `requireAuth` and `requireAdmin`. The service then
re-checks authorization using locked current DB rows inside the transaction.
Actor and target locks are acquired in numeric ID order to reduce deadlocks.
The account mutation and mandatory `admin_action_audits` INSERT use the same
connection and commit together. Audit or mutation failure rolls both back.
FR-022 takes precedence over T040's conditional wording: each actual change must
record actor, target, action, old/new values and database timestamp. Denials,
failed transactions and no-ops do not create successful-change audit records.

Disabling an account blocks its next login and protected request using an old
token. Re-enabling allows valid credentials and an existing unexpired token to
work again. These endpoints do not issue/extend/revoke tokens and introduce no
refresh/session table. Audit viewing and browser administration UI are outside
this implementation scope.

## Authorization contract

The shared `requireAuth` middleware attaches only `id`, `fullName`, `email`,
`role`, and `isActive` to `req.user`. Its `id` is an exact decimal **string** to
preserve PostgreSQL BIGINT precision; endpoint profiles preserve that same type.
Passwords, hashes, and tokens are excluded from user profiles.
It accepts tokens only from `Authorization: Bearer <jwt>`; body, query, and cookie
tokens do not authenticate a request. Missing/invalid tokens, out-of-range
subjects, and missing accounts produce `401 UNAUTHORIZED`; inactive accounts
produce `403 INACTIVE_ACCOUNT`. JWT configuration errors remain
`500 AUTH_CONFIG_ERROR`, and database failures are forwarded to the central
error handler rather than converted to authentication failures.

Use `requireRole(...roles)` after `requireAuth`; the allowed roles must be an
explicit non-empty list drawn from `tenant`, `landlord`, and `admin`. The guard
uses only `req.user`, with `401 UNAUTHORIZED` for a missing/invalid identity,
`403 INACTIVE_ACCOUNT` for an inactive account, and `403 FORBIDDEN` for an
unlisted role. `requireAdmin` is `requireRole('admin')`. Roles have no implicit
inheritance: admin does not pass `requireRole('landlord')` and no role guard
substitutes for an ownership check.

Protected routes must enforce the following rule set:

- Guest users cannot access protected resources.
- Tenant users may not access landlord-only and admin-only operations.
- Landlord users may not access admin-only operations.
- Admins can access admin-only operations but not the private data of another user unless specifically allowed by the respective business rule.
- Current DB role and `is_active` status are authoritative on each request.

### Listing ownership middleware (T026)

`requireOwnership(req, res, next)` checks `listings.owner_id` using the canonical
positive decimal string in `req.params.id`. For future landlord listing actions,
compose `requireAuth`, `requireRole('landlord')`, then `requireOwnership`, followed
by the business handler. The ownership guard consumes the active DB profile in
`req.user`, performs a parameterized `SELECT owner_id FROM listings WHERE id = $1`,
and compares exact string IDs. It never uses body/query owner IDs or grants an
administrator exception. It selects no listing content or user credentials.

| Condition | Status / code |
|---|---|
| Missing/invalid authenticated identity | `401 UNAUTHORIZED` |
| Inactive identity | `403 INACTIVE_ACCOUNT` |
| Missing, non-canonical, non-positive or out-of-BIGINT-range listing ID | `400 VALIDATION_ERROR` |
| Listing does not exist | `404 NOT_FOUND` |
| Stored owner differs from authenticated ID, including an admin requester | `403 FORBIDDEN` |
| Unexpected database failure | Forward original error to the central handler; normally `500 INTERNAL` |
| Stored owner matches | Call `next()` without granting any additional role |

This guard does not replace a role policy or make a later write atomic with its
ownership read. Business handlers must also constrain a mutation by the
authenticated owner (or use a suitable transaction) when ownership can change
between the read and write. T026 itself adds no production route. T027 now mounts
the real [UC-17 deletion endpoint](./listing-ownership-api.md), with actor/listing
locks and a conditional DELETE. Its production-app PostgreSQL tests supply T025
business evidence; old ownership/policy harnesses retain their narrower purpose.

### Backend session validation scope (T028–T033)

The production authentication profile endpoint is `GET /api/v1/auth/me`; the
admin PATCH routes above also use `requireAuth`. The `/me` chain verifies the token and reloads the
account before `authController.me` returns the safe profile. This is the existing
session-restoration backend pattern; it intentionally keeps database revalidation
in middleware rather than duplicating it in the crypto-only `authService`.
The public/idempotent logout endpoint remains as specified above.

Backend tests alone establish session validation and response behavior. The
separate `frontend/e2e/auth-session.spec.js` now verifies storage, reload, browser
process reopen, local logout and invalid-session recovery against the real backend.
Standard sessions use sessionStorage; remembered login uses localStorage; profiles
are not restored from cached client objects. Pending verification hides account
content; network/ordinary FORBIDDEN errors permit retry without deleting the token.
Only UNAUTHORIZED/INACTIVE_ACCOUNT end the session. Local logout clears both stores
and in-memory private state before its acknowledgement, and invalidates pending
checks so late responses cannot restore it. Server-side JWT revocation is absent.
