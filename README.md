# Roomify

Roomify is a full-stack rental/boarding-house platform focused on User Authentication and Role Management.
This project implements the end-to-end feature set across frontend, backend, and database, including registration, login, JWT-based session handling, protected routes, and admin role management.

## Submission scope

Submit the following folders/files only:

- backend/
- frontend/
- src/
- README.md

Do not include in the final submission package:

- backend/node_modules/
- frontend/node_modules/
- frontend/dist/
- backend/dist/
- .env and any environment secret files
- any generated cache or temporary build directories
- screenshots, logs, and local DB artifacts not required for source review

## Implemented feature

- User registration with email and password validation
- User login with JWT authentication
- Session persistence and protected routes
- Role-based access: tenant, landlord, admin
- Admin dashboard to update user role and active status
- Frontend screens for auth and dashboard flows
- PostgreSQL persistence with real API integration

## Tech stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT + bcrypt

## Project structure

- backend/: Express API, controllers, services, routes, migrations
- frontend/: Vite React app and UI screens
- src/specs/001-user-auth/: spec, plan, tasks, quickstart, and API contracts

## Spec kit artifacts

- [src/specs/001-user-auth/spec.md](src/specs/001-user-auth/spec.md)
- [src/specs/001-user-auth/plan.md](src/specs/001-user-auth/plan.md)
- [src/specs/001-user-auth/tasks.md](src/specs/001-user-auth/tasks.md)
- [src/specs/001-user-auth/quickstart.md](src/specs/001-user-auth/quickstart.md)
- [src/specs/001-user-auth/contracts/auth-api.md](src/specs/001-user-auth/contracts/auth-api.md)
- [src/specs/001-user-auth/data-model.md](src/specs/001-user-auth/data-model.md)

## Demo video

Add the final YouTube link here before submission:

- Demo video: https://youtube.com/...

The video should show:

1. Register a new user
2. Login as a tenant
3. View the tenant dashboard
4. Login as admin
5. Update a user role or status from admin screen
6. Confirm role-based UI changes

## Local run

Backend:

```powershell
cd backend
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend is expected to run on http://localhost:5173 and the backend on http://localhost:3000.

## Notes for final submission

- Keep only source code and required documentation.
- Remove node_modules and generated build directories before packaging.
- Do not submit secret keys or `.env` files.
- Ensure the project still runs after cleanup.
- Include the demo video link in this README before final upload.

## Team

This project is part of Roomify, developed by Group 13 with five members:

| No. | Member | Responsibility |
|---|---|---|
| 1 | Đặng Hiển | Functional Group E: Backend, database, authentication logic, and integration |
| 2 | Nguyễn Hữu Nghĩa | Functional Group E: Frontend, role-based UI, Spec Kit artifacts, and integration |
| 3 | Đỗ Quốc Đại | Group member – contributes to other project assignments |
| 4 | Từ Thái Hưng | Group member – contributes to other project assignments |
| 5 | Võ Minh Khang | Group member – contributes to other project assignments |

**Note:** All five members belong to Group 13. However, Functional Group E (User Authentication and Role Management) was implemented by Đặng Hiển and Nguyễn Hữu Nghĩa.