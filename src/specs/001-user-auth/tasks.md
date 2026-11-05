# Tasks: User Authentication and Role Management

**Input**: Design documents from `/specs/001-user-auth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/auth-api.md

## Full-stack execution model for a 2-person team

- **Person A (Backend + Database)**: auth service, DB schema/migrations, middleware, auth routes, tests, admin role/status flows
- **Person B (Frontend + Integration)**: React login/register screen, auth state management, protected routes, API integration, end-to-end validation
- **Shared checkpoint**: both must agree on the auth contract before the UI starts calling the backend

## Format: `[ID] [P?] [Story] Description`

## Phase 0: Full-stack bootstrap

- [ ] F001 [P] [Frontend] Initialize the `frontend/` app skeleton with the expected project structure for React + Vite
- [ ] F002 [P] [Frontend] Create the initial frontend auth pages: `LoginPage`, `RegisterPage`, and `DashboardPage` with empty route shell
- [ ] F003 [P] [Frontend] Create `AuthContext`, API client layer, and protected-route guard skeleton in `frontend/src/`

## Phase 1: Setup (Shared Infrastructure)

- [ ] B001 [P] [Setup] Review the current backend structure and map auth feature files in `backend/src/` and `backend/tests/`
- [ ] B002 [P] [Setup] Add the required auth dependencies in `backend/package.json` (`bcryptjs` and `jsonwebtoken`)
- [ ] B003 [P] [Setup] Confirm test environment variables for `DATABASE_URL` and `TEST_DATABASE_URL` and document developer setup in `backend/src/config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T004 [Foundation] Add a reusable `auth` service module in `backend/src/services/authService.js` for password hashing, verification, token issuance, and token validation
- [ ] T005 [Foundation] Add a shared `requireAuth` middleware in `backend/src/middlewares/auth.js` to read JWTs and load the current user from the database
- [ ] T006 [Foundation] Add `requireRole` and `requireAdmin` helpers in `backend/src/middlewares/auth.js` to enforce tenant/landlord/admin access rules
- [ ] T007 [Foundation] Add a central `authController.js` in `backend/src/controllers/` to handle registration, login, current-user retrieval, and logout flows
- [ ] T008 [Foundation] Add `authRoutes.js` in `backend/src/routes/` and register the auth endpoints in `backend/src/app.js`
- [ ] T009 [Foundation] Add DB-level validation helpers around the existing `users` table and use `AppError` patterns for `INVALID_CREDENTIALS`, `EMAIL_CONFLICT`, `INACTIVE_ACCOUNT`, and `UNAUTHORIZED`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Register a Tenant Account (Priority: P1) 🎯 MVP

**Goal**: Allow a new visitor to create a tenant account with email normalization and validation.

**Independent Test**: Register a new Gmail address and verify one account is created, hashed password is stored, and the session is established.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add registration validation tests in `backend/tests/auth.test.js` covering valid registration, duplicate normalized email, and invalid input
- [ ] T011 [P] [US1] Add a DB-level test that verifies only a single tenant row is created for a normalized email and the password hash is not plaintext

### Implementation for User Story 1

- [ ] T012 [P] [US1] Implement normalized input handling in `backend/src/services/authService.js` for `fullName`, `email`, and `password`
- [ ] T013 [US1] Create the registration flow in `backend/src/controllers/authController.js` and return a safe authenticated profile
- [ ] T014 [US1] Add the `POST /api/v1/auth/register` route in `backend/src/routes/authRoutes.js`
- [ ] T015 [US1] Update `backend/src/app.js` to mount the auth routes and preserve current error-shape semantics
- [ ] T016 [US1] Add validation and conflict handling to reject unsupported role fields and malformed payloads

**Checkpoint**: User Story 1 should be independently functional and testable.

---

## Phase 4: User Story 2 - Sign In with an Existing Account (Priority: P1)

**Goal**: Authenticate existing users by email/password while blocking inactive or unknown accounts.

**Independent Test**: Sign in with valid credentials and with invalid/inactive credentials to confirm the server returns the correct behavior and no session is established.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add login tests for success, invalid password, unknown email, and inactive account in `backend/tests/auth.test.js`
- [ ] T018 [P] [US2] Add a token expiry test covering 1h vs 7d remember-me behavior in `backend/tests/auth.test.js`

### Implementation for User Story 2

- [ ] T019 [P] [US2] Implement password verification and JWT issuance in `backend/src/services/authService.js`
- [ ] T020 [US2] Add `POST /api/v1/auth/login` in `backend/src/controllers/authController.js` and `backend/src/routes/authRoutes.js`
- [ ] T021 [US2] Reject inactive accounts with a clear `INACTIVE_ACCOUNT` error and no token creation
- [ ] T022 [US2] Ensure the response includes only safe user data and the current role, not raw password fields

**Checkpoint**: User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Access Only Authorized Functions and Resources (Priority: P1)

**Goal**: Enforce authorization on protected operations.

**Independent Test**: Verify guest, tenant, landlord, and admin access to landlord-only and admin-only routes using direct API requests instead of browser state.

### Tests for User Story 3

- [ ] T023 [P] [US3] Add route-level auth tests for guest and invalid-session access denial in `backend/tests/auth.test.js`
- [ ] T024 [P] [US3] Add role enforcement tests for tenant vs landlord vs admin in `backend/tests/auth.test.js`
- [ ] T025 [P] [US3] Add ownership or admin privilege matching tests for protected listing actions and admin-only operations

### Implementation for User Story 3

- [ ] T026 [US3] Add a `requireOwnership` or equivalent pattern in `backend/src/middlewares/auth.js` for listing-specific access checks
- [ ] T027 [US3] Protect resource routes by attaching `requireAuth` and `requireRole` middleware to the relevant endpoints in `backend/src/routes/`
- [ ] T028 [US3] Ensure every protected route re-loads the current user from PostgreSQL and does not trust client-supplied role state
- [ ] T029 [US3] Add structured authorization errors (`UNAUTHORIZED`, `FORBIDDEN`) via the existing `AppError` error middleware

**Checkpoint**: Authorization checks are enforced for all protected operations.

---

## Phase 6: User Story 4 - Restore and End a Browser Session (Priority: P1)

**Goal**: Restore valid sessions after reload and let users sign out of the current browser.

**Independent Test**: Reload the app with a stored session, simulate an invalid session, and confirm the browser is cleared and the user is returned to sign-in.

### Tests for User Story 4

- [ ] T030 [P] [US4] Add session restore tests for valid, expired, and deleted/inactive sessions in `backend/tests/auth.test.js`
- [ ] T031 [P] [US4] Add logout test covering clear-cookie or clear-token client-side state and protected-route rejection after sign-out

### Implementation for User Story 4

- [ ] T032 [P] [US4] Add `GET /api/v1/auth/me` and `POST /api/v1/auth/logout` to `backend/src/routes/authRoutes.js`
- [ ] T033 [US4] Implement session restore logic in the auth service and enforce account revalidation before returning the profile
- [ ] T034 [US4] Make logout clear any session token or storage state on the client while ensuring server response remains consistent

**Checkpoint**: Browser session restore and sign-out behavior are predictable.

---

## Phase 7: User Story 5 - Manage Non-Administrator Roles (Priority: P2)

**Goal**: Let an admin assign supported roles to non-admin accounts.

**Independent Test**: Use an admin account to assign `landlord` to a tenant and verify the next protected request reflects the new role.

### Tests for User Story 5

- [ ] T035 [P] [US5] Add admin role-change tests for valid tenant-to-landlord assignment, invalid roles, self-escalation attempts, and missing-user cases
- [ ] T036 [P] [US5] Add audit or persistence checks to confirm the new role is stored and the previous role is not lost

### Implementation for User Story 5

- [ ] T037 [US5] Add an admin controller for role changes in `backend/src/controllers/adminController.js`
- [ ] T038 [US5] Add `PATCH /api/v1/admin/users/:id/role` and validate the target user is non-admin and the requested role is supported
- [ ] T039 [US5] Add `requireAdmin` enforcement to the admin route and persist the change in the `users` table
- [ ] T040 [US5] Create an audit record or equivalent admin action record if the project chooses to keep an explicit action log

**Checkpoint**: Role assignment is controlled and auditable.

---

## Phase 8: User Story 6 - Disable and Re-enable Non-Administrator Accounts (Priority: P2)

**Goal**: Let an admin disable or re-enable non-admin accounts without deleting history.

**Independent Test**: Disable a target account, confirm login fails, then re-enable and confirm login succeeds again.

### Tests for User Story 6

- [ ] T041 [P] [US6] Add account status tests for disable/enable flows and admin-denial checks in `backend/tests/auth.test.js`
- [ ] T042 [P] [US6] Add a regression test to ensure disabled users keep their historical records while being blocked from sign-in

### Implementation for User Story 6

- [ ] T043 [US6] Add `PATCH /api/v1/admin/users/:id/status` in `backend/src/controllers/adminController.js`
- [ ] T044 [US6] Restrict status changes to non-admin users and validate `isActive` values before persisting
- [ ] T045 [US6] Reuse the common auth middleware so a disabled account cannot continue creating or renewing sessions

**Checkpoint**: The admin can control access without deleting the user's history.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T046 [P] Update documentation and examples in `README.md` and feature docs
- [ ] T047 [P] Run the auth-focused test suite and fix any edge cases uncovered by role and status validation
- [ ] T048 [P] Review API error handling across all auth/admin endpoints and ensure consistent `AppError` usage
- [ ] T049 [P] Add final security review for password handling, session expiry, and authorization checks across protected routes

---

## Dependencies & Execution Order

### Phase Dependencies
- Setup → Foundational → User stories in priority order.
- User Story 1 must land before story 2 if the team wants a strict MVP path, but the stories are independently testable and can be developed in parallel by a larger team.
- User Story 3 depends on the auth foundation and is the gate for secure protected flows.
- User Story 4 depends on login and current-user retrieval.
- User Story 5 and 6 depend on admin authorization and route protection.

### Parallel Opportunities
- Setup and foundational tasks marked `[P]` can run in parallel if laid out across multiple developers.
- Auth tests for one story can be written before implementation and run in parallel with service work.
- Role and status management tasks are independent once the admin route structure exists.

### MVP Recommendation

The minimal viable feature to ship is:
1. User Story 1 — register a tenant account
2. User Story 2 — sign in with an existing account
3. User Story 3 — protected-route authorization enforcement
4. User Story 4 — session restoration/logout

This slice delivers secure account access without requiring the more advanced admin workflows.
