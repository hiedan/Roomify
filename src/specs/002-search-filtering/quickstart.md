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
- Use the confirmed room-type codes from [spec.md](./spec.md). Keep existing rows with no reliable type unclassified; do not invent a backfill.

Keep database URLs and credentials in the local backend environment configuration; never put secrets in frontend variables, source files, or this guide.

## Prepare the Database

From `backend/`, inspect the configured application and test databases using the repository's migration and schema-check commands:

```powershell
npm.cmd run migrate
npm.cmd run db:check
npm.cmd run migrate:test
npm.cmd run db:check:test
```

Run these only after verifying that application and test URLs point to different intended projects. The migration must seed only the four confirmed room types and leave unclassifiable legacy listings null.

### T005 execution status

On 2026-11-16, the read-only `npm.cmd run db:check:test` preflight confirmed the configured Roomify-Test project is separate from the application project. `npm.cmd run migrate:test` applied migration `1700000004000_search_room_types`, and the subsequent `npm.cmd run db:check:test` completed successfully, validating the resulting schema history. No application-database migration was run. Keep database URLs and credentials private.

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

Prepare 1,000 synthetic approved listings with varied districts, confirmed room types, prices, areas, images, and amenities in the isolated verification environment. Include pending and rejected control records to verify they never appear. Measure end-to-end time from submitting a valid search until the first result page is displayed for 100 documented queries; report the environment and observed percentile. The target is at least 95% of searches within 3 seconds.

For usability, recruit 10 participants who have not implemented this feature. Give each the same task: “Find a room in Bình Thạnh, type Studio / căn hộ mini, at or below 5,000,000 VND/month, at least 20 m², and with Wi-Fi.” At least 9 of 10 must find a matching approved listing within 2 minutes without assistance. Record completion count/time and participant feedback using synthetic listings only.

Verify keyboard-only operation and absence of horizontal page scrolling at viewport widths of 320 CSS pixels and 1280 CSS pixels. Record browser, viewport dimensions, test environment, and results. Do not treat unit tests or mocked API responses as database performance evidence.
