# Implementation Plan: User Authentication and Role Management

**Branch**: `[Nghia]` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-user-auth/spec.md`

## Summary

This feature adds a secure authentication flow for Roomify's backend API, including account registration, login, logout, session restoration, and role-based authorization checks. The implementation will use Express.js with PostgreSQL persistence, JWT-based auth tokens, password hashing, and explicit role/status enforcement at the API layer. The repository already contains the base app and DB migration infrastructure; the new work must extend those patterns without circumventing the existing validation and error-handling conventions.

**Repository naming exception:** the current backend uses established JavaScript module names such as `app.js`, `db.js`, `config.js`, and `errorHandler.js`. This feature therefore follows the repository's existing JS naming convention rather than introducing a new kebab-case source-file pattern.

## Technical Context

**Language/Version**: Node.js 18+ (current backend stack uses CommonJS)

**Primary Dependencies**: Express 4.x, PostgreSQL, pg, Zod, dotenv, node-pg-migrate, Jest, Supertest

**Planned Auth Dependencies**: bcryptjs or bcrypt, jsonwebtoken

**Storage**: PostgreSQL via `pg` pool; user/role status validation in migration schema; session information kept in JWT rather than a separate session table for v1

**Testing**: Jest + Supertest for API and DB validation; migration-level checks stay in backend tests

**Target Platform**: Roomify backend REST API running in Node.js

**Project Type**: Web service / API backend

**Performance Goals**: Auth endpoints respond in under 300 ms for normal request flows; protected requests must enforce role checks before resource access

**Constraints**: Only `tenant`, `landlord`, and `admin` roles are valid; account status must block inactive users; every protected operation must verify current DB state, not stale client state

**Scale/Scope**: Support the current project's user model and listing workflow; role enforcement should be reusable for future protected endpoints

## Constitution Check

*GATE: Must pass before implementing the feature. Re-check before merge.*

- User-Centered Design: Pass — the feature directly supports account creation, login, and access control required by Roomify users.
- Code Quality and Maintainability: Pass — the existing project organizes routes/controllers/services and uses centralized error handling; the auth feature should follow that structure.
- Test-First and Verification: Pass — new behavior must be covered by focused tests for registration, login, auth, authorization, and session restoration.
- Consistent Architecture and Integration: Pass — the feature aligns with the existing backend layout, migration pattern, and PostgreSQL persistence model.
- Security and Data Integrity: Pass, but must be treated as a hard gate — all auth code must validate inputs, normalize emails, hash passwords, and reject unsupported roles and inactive accounts.

## Project Structure

### Documentation (this feature)

```text
src/specs/001-user-auth/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth-api.md
├── tasks.md
└── README.md (optional if needed later)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config.js
│   ├── db.js
│   ├── controllers/
│   ├── middlewares/
│   │   └── errorHandler.js
│   ├── routes/
│   ├── services/
│   └── utils/
│       ├── AppError.js
│       └── response.js
├── tests/
│   ├── app.test.js
│   ├── db.test.js
│   ├── helpers.js
│   ├── setup.js
│   └── globalSetup.js
├── migrations/
│   └── 1700000000000_init.js
├── package.json
└── eslint.config.js
```

**Structure Decision**: Keep the feature backend-only, matching the current repository architecture. Auth logic will live in `backend/src/services`, controller/route modules will be under `backend/src/controllers` and `backend/src/routes`, and shared auth policy logic will live in `backend/src/middlewares` or utility modules.

## Complexity Tracking

No constitutional violations require justification. This feature is a straightforward backend enhancement within the existing architecture.
