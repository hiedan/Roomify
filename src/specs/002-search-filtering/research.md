# Research: Search and Filtering

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

**Date:** 2026-11-12

**Feature**: [spec.md](./spec.md)

## Decision 1: Extend the existing public REST API and React application

**Decision**: Add public listing-search, filter-options, and approved-listing detail reads under the existing `/api/v1/listings` route. Add a public search page and a minimal public listing-detail page to the existing React Router application.

**Rationale**: The repository already has an Express application, a versioned listing router, a shared response/error format, and a React/Vite app. However, the current listing router only implements landlord deletion, and the frontend has no public search or listing-detail route. New public read behavior is required for the visitor flows in the specification.

**Alternatives considered**:
- A separate search service/application: rejected because it would duplicate existing API and frontend infrastructure.
- Reusing a detail page that does not exist in the current repository: rejected because it cannot satisfy the result-card navigation scenario.

## Decision 2: Keep listing search public and project only public fields

**Decision**: Do not require authentication for search, filter options, or public details. Restrict results and detail reads to `status = 'approved'`, and select only listing fields needed for public cards and details. Do not join or serialize user/account rows.

**Rationale**: FR-001 and FR-006 require anonymous search and approved-only results; FR-014 prohibits exposing private account or landlord information.

**Alternatives considered**:
- Requiring a tenant session: rejected because it contradicts the visitor search requirement.
- Selecting full listing and owner records and removing private fields in the browser: rejected because private information must not be sent to the client.

## Decision 3: Use validated, parameterized PostgreSQL search and deterministic pagination

**Decision**: Parse and validate supported query parameters before querying. Use bound SQL parameters for keyword, filter, and pagination values; combine selected filters with AND semantics; match all selected amenities; return 12 records ordered by `created_at DESC, id DESC`; include the total count in the existing pagination envelope.

**Rationale**: The backend uses PostgreSQL through `pg`, Zod validation, and centralized error handling. Parameter binding and strict validation prevent malformed or unsupported criteria from silently broadening results. A unique tie-breaker keeps page boundaries stable.

**Alternatives considered**:
- Building SQL from raw query strings: rejected because user-controlled values must not become SQL syntax.
- Applying filters only in the browser: rejected because pagination and approved-only visibility must be correct at the data boundary.
- Offset-free pagination: not needed for the specified 1,000-listing acceptance dataset and would complicate page-number navigation.

The existing frontend `apiRequest` helper returns only the response `data` property, while the backend pagination helper places pagination metadata beside `data`. The listing API client must preserve that metadata using the shared response/error conventions without changing the return shape expected by existing authentication callers.

## Decision 4: Add a shared room-type catalog through a versioned migration

**Decision**: Introduce a database-backed room-type catalog referenced by listings. Return active room types from the filter-options endpoint; validate selected types against that catalog. Final codes/labels and existing-row mapping are an implementation gate requiring agreement with the listing-creation owner.

**Rationale**: The initial migration has no room-type field, and the frontend and backend must use the same available choices. A single catalog avoids duplicated, drifting UI and API value lists.

**Alternatives considered**:
- Independently hardcoding room-type strings in the client and server: rejected because the lists can diverge.
- Guessing a category list or assigning an arbitrary type to existing records: rejected because no canonical values or accurate backfill mapping are documented.

## Decision 5: Keep filter choices and public result data aligned with approved listings

**Decision**: Build districts from approved listings and provide active catalog room types and amenities through a public filter-options response. Validate IDs/codes against supported values. Unsupported input returns a validation error rather than dropping the filter.

**Rationale**: The schema already contains districts, amenities, and listing-amenity associations. One options response supports usable controls without hardcoding DB identifiers in the frontend.

**Alternatives considered**:
- Duplicating district and amenity data in frontend constants: rejected because those values are already stored and can change.
- Silently ignoring an unknown filter: rejected by FR-011 because it can produce broader results than requested.

## Decision 6: Use existing test and migration infrastructure

**Decision**: Add backend unit/API integration tests using Jest and Supertest, browser flow tests using the existing Playwright setup, and a versioned node-pg-migrate migration. Verify the 1,000-listing response-time target in the documented test environment.

**Rationale**: These tools and conventions already exist in `backend/package.json`, `frontend/package.json`, and the repository's prior feature artifacts. No additional dependency is required.

**Alternatives considered**:
- Adding a new test runner or migration system: rejected because existing project tools cover the API, database, and browser layers.

## Repository Evidence

- `backend/src/app.js` mounts listing routes under `/api/v1/listings`.
- `backend/src/routes/listingRoutes.js` currently provides only an authenticated landlord delete route.
- `backend/migrations/1700000000000_init.js` defines listings, images, amenities, and listing-amenity associations; it has no room-type field.
- `backend/src/utils/response.js` defines success and paginated response envelopes.
- `backend/package.json` provides Jest, Supertest, and node-pg-migrate scripts.
- `frontend/src/App.jsx` currently routes users to authentication/dashboard flows and has no public search or listing-detail pages.
- `frontend/package.json` and `frontend/playwright.config.js` provide Vite, React Router, and Playwright.
- `src/specs/001-user-auth/quickstart.md` documents the current Supabase PostgreSQL test-database safety requirements.

## Remaining Team Decisions

- The canonical room-type codes and labels, plus a correct mapping for existing listings, must be agreed with the listing-creation owner before implementation. This plan intentionally does not invent or seed categories.
- The proposed performance and usability targets remain acceptance proposals until confirmed by the team.
