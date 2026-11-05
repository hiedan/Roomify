# Research: User Authentication and Role Management

## Decision 1: Use JWT-based session handling with database-backed account checks

**Decision**: Roomify's v1 auth flow will use JWTs for browser sessions, but the server will validate the current account state against PostgreSQL on each protected request. Token lifetime will be 1 hour for standard sessions and 7 days for remember-me sessions.

**T004 signing-key policy**: Fix signing and verification to HS256. Require a
non-placeholder `JWT_SECRET` of at least 32 UTF-8 bytes for both operations, with
generic `AUTH_CONFIG_ERROR` failures that disclose neither keys nor tokens. Generate
deployment keys with `crypto.randomBytes(32).toString('hex')`; see
[quickstart.md](./quickstart.md#jwt-signing-key-t004) for configuration and migration
of shorter keys. No DB account checks are implemented by T004.

**Rationale**: The repo already exposes a pattern for server-side validation, and the spec explicitly requires account status and role changes after login to be reflected in later requests. A classic JWT with a user ID and role in the payload is compatible with that requirement, while a DB lookup keeps authorization current and safe.

**Alternatives considered**:
- Server-side session table: stronger revocation semantics, but larger implementation scope and a migration change beyond the current repository pattern.
- Browser-local role state only: rejected because it cannot enforce server-side authorization or protect against tampering.

## Decision 2: Use bcrypt for password hashing and normalization for email addresses

**Decision**: Registration will trim and lowercase the provided email before uniqueness checks and storage; passwords will be hashed with a strong password-hashing library before insertion.

**Rationale**: The spec requires normalized Gmail addresses and rejects duplicate accounts. Hashing protects credentials even if the DB is exposed.

**Alternatives considered**:
- Plain-text storage: rejected because it violates secure-data principles.
- Email-only uniqueness without normalization: rejected because uppercase/whitespace variants would create duplicate accounts.

## Decision 3: Keep authorization checks centralized and reusable

**Decision**: At minimum, the backend will provide reusable middleware or utility functions such as `requireAuth`, `requireRole`, and `requireOwnership`-style checks for protected routes.

**Rationale**: The spec tests cross-cutting authorization flows for tenant, landlord, admin, owner checks, and admin management APIs. A central policy layer keeps the implementation consistent and testable.

**Alternatives considered**:
- Checking roles only in individual route handlers: possible but redundant and error-prone.
- trusting browser state: rejected because it breaks the security requirement.

## Decision 4: Split admin role/status management into dedicated API endpoints

**Decision**: Support separate admin endpoints to update a target user's role and enable/disable the user account, with permission checks and validation before any mutation.

**Rationale**: The requirement describes explicit role assignment and account re-enable/disable workflows, and this is the cleanest way to keep enforcement and auditability separate.

**Alternatives considered**:
- Allowing role changes through public registration: rejected because it creates self-escalation risk.
- Editing user records directly through generic endpoint: possible but too broad and not aligned with the feature spec.

## Open technical unknowns resolved from the repo

- The project is a single backend API service in `backend/` using CommonJS modules.
- The DB already has a `users` table with `role` and `is_active` fields, so the auth feature should build on those attributes rather than inventing a new user model.
- Express error handling already uses a centralized `AppError` and `ZodError` conversion pattern, which the auth endpoints should respect.
- Jest and Supertest are already configured and can validate auth endpoints without introducing a new test framework.
