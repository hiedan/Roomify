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

### Backend verification on 2026-11-21

- Environment: Windows, Node.js v26.13.0, npm 11.20.0. The read-only `npm.cmd run db:check:test` succeeded before and after testing and confirmed the isolated Roomify-Test target and expected schema. No application database was migrated.
- `npm.cmd run test:unit`: **passed**, 18/18 suites and 572/572 tests.
- `npm.cmd run lint`: **passed**, 0 errors and 1 existing warning for an unused `eslint-disable` directive in `backend/migrations/1700000000000_init.js`.
- `npm.cmd test -- --runInBand`: **passed**, 28/28 suites and 827/827 tests; elapsed time 905.255 seconds. `listingSearchApi.integration.test.js` passed all 14 search integration cases.
- The previous 5-second Jest default was too short for the remote test database: the focused admin integration suite passed with 30-second per-test timeout and included an 18.6-second test. Set `testTimeout: 30000` in `backend/jest.config.js`, which is used by the integration suite; the separate unit Jest configuration retains its existing default. The integration suite then passed without the earlier timeout or audit foreign-key cleanup failures.
- Browser fixture cleanup now snapshots its ID list before issuing SQL, so Jest mock call history retains the BIGINT IDs even after successful cleanup removes them from the tracked list.
- T025 backend verification passed. T026 frontend verification was recorded on 2026-11-21; T027 and T028 remain open.

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

### Frontend verification on 2026-11-20

- Environment: Windows, Chromium through Playwright, Vite frontend, and the isolated Roomify-Test backend used by the Playwright server. `npm.cmd run db:check:test` succeeded before browser tests and reported project ref `seggbbbuspquwxeifsab` with the search room-type migration present. No application database was migrated.
- From `frontend/`, `npm.cmd run build` passed after the final UI changes.
- From `frontend/`, `npm.cmd run test:e2e -- e2e/search-filtering.spec.js` passed 10/10 after the final changes. Search API responses in these browser cases were intercepted and mocked; the tests verify frontend behavior, including keyboard access and no horizontal page scrolling at 320 and 1280 CSS pixels, but do not establish real search API/database integration.
- From `frontend/`, `npm.cmd run test:e2e` completed with 48/50 passed before the final page-retry test was added. Two existing auth-session cases failed while using Roomify-Test: one timed out during fixture cleanup, and another lost a PostgreSQL connection. A focused rerun of those two cases passed 1/2; the remaining case timed out waiting for login to finish. At that point, the full Playwright gate was **not passing** and T026 remained open; see the 2026-11-21 verification below.
- Visual review used the UC06 search and UC08 listing-detail prototype images. The implemented layout follows the filter sidebar, result cards, pagination, image gallery, and detail-information arrangement. The prototype's minimum-price/multi-type controls and landlord contact card are omitted because the current search contract does not provide those operations or public account fields. Broken or missing image URLs show a neutral placeholder.
- SC-003 performance measurement with 1,000 synthetic approved listings and the SC-004 ten-person usability check were not run. T027 and the shared completion review T028 remain open.

### Frontend verification on 2026-11-21 — T026

- Environment: Windows, Node.js v24.15.0, Playwright 1.64.1 with Chromium, Vite frontend, and the isolated Roomify-Test backend. Before browser execution, `node scripts/database.js check --test` from `backend/` passed for project ref `seggbbbuspquwxeifsab` and confirmed that migration `1700000004000_search_room_types` is present. The configured test-target guard and single-worker Playwright configuration kept the test run on Roomify-Test; no application-database migration was performed.
- From `frontend/`, `npm.cmd run build` passed. `npm.cmd run test:e2e` passed **51/51 tests** in approximately 4.1 minutes, including the two auth-session cases that failed in the 2026-11-20 run.
- The search browser tests cover keyboard navigation to a result detail and absence of horizontal page scrolling at 320 and 1280 CSS-pixel widths. Their search API responses are mocked. The auth-session suite includes real backend/database flows on Roomify-Test. This pass closes T026 but does not establish real search UI/API/database integration or the SC-003 performance target; T027 and T028 remain open.
