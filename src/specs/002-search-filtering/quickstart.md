# Quickstart: Search and Filtering Verification

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

**Feature**: [spec.md](./spec.md)

**API contract**: [contracts/search-api.md](./contracts/search-api.md)

**Data model**: [data-model.md](./data-model.md)

## Prerequisites

- Node.js 18+ and npm.
- Backend and frontend dependencies installed in their respective directories.
- A configured Roomify application PostgreSQL project and a separate, explicitly configured Roomify-Test PostgreSQL project, following the root [database setup instructions](../../../README.md).
- Synthetic test records only. Do not use the test project for data that must be preserved.
- The listing-creation owner has agreed on the room-type codes/labels and an existing-record mapping before applying the room-type migration.

Keep database URLs and credentials in the local backend environment configuration; never put secrets in frontend variables, source files, or this guide.

## Prepare the Database

From `backend/`, inspect the configured application and test databases using the repository's migration and schema-check commands:

```powershell
npm.cmd run migrate
npm.cmd run db:check
npm.cmd run migrate:test
npm.cmd run db:check:test
```

Run these only after verifying that application and test URLs point to different intended projects. The migration must not assign an unconfirmed room type to existing listings.

## Verify the Backend

From `backend/`, run the unit suite and lint:

```powershell
npm.cmd run test:unit
npm.cmd run lint
```

Then run the integration suite against the configured Roomify-Test database:

```powershell
npm.cmd test -- --runInBand
```

The search API tests should verify anonymous access, approved-only visibility, all filters together, all-selected-amenities matching, inclusive boundaries, malformed/unsupported criteria, deterministic paging, public-field privacy, detail visibility, empty results, and database/service errors.

## Verify the Browser Flow

From `frontend/`, run the existing Playwright flow:

```powershell
npm.cmd run test:e2e
```

Verify a visitor can open search without signing in, use keyboard-accessible filters, see loading/results/empty/error states, clear filters, move between 12-item pages without losing criteria, open an approved result, and use the minimum 320 CSS-pixel viewport without horizontal scrolling.

## Verify the Performance Target

Prepare 1,000 synthetic approved listings with varied districts, room types, prices, areas, images, and amenities in the isolated verification environment. Measure end-to-end search response/display time across a documented set of valid queries. Report the environment and observed percentile; the target is at least 95% of searches showing the first page within 3 seconds. Do not treat unit tests or mocked API responses as database performance evidence.
