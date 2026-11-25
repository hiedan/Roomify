---
description: "Implementation tasks for Search and Filtering"
---

# Tasks: Search and Filtering

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

**Input**: Design documents from `src/specs/002-search-filtering/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [search API contract](./contracts/search-api.md), and [quickstart.md](./quickstart.md)

## Team Ownership and Conflict Avoidance

| Contributor | Owns | Avoid editing |
|---|---|---|
| Nguyễn Hữu Nghĩa | Backend API, PostgreSQL schema/migrations, backend tests, backend verification | `frontend/` files |
| Đặng Hiển | Frontend pages/components/API client, Playwright browser tests, frontend verification | `backend/` files and migrations |
| Both | Agree on room-type values/backfill and API handoff before implementation | Do not edit the same files at the same time; coordinate any contract change before either side implements it |

The API source of truth is [contracts/search-api.md](./contracts/search-api.md). Tasks marked `[P]` can proceed in parallel after their stated prerequisites and only when contributors work in their separate owned files.

## Format

Every implementation task uses the required checklist format:

Each task starts with a checkbox and sequential task ID, uses `[P]` only when parallelizable, includes `[US#]` in user-story phases, and names its file path(s) and owner.

`[P]` is used only when the task can run concurrently without changing another task's files. User-story tasks include their story label; setup, foundational, and polish tasks do not.

## Phase 1: Setup

**Purpose**: Resolve shared decisions and establish the handoff so backend and frontend work can proceed without conflicting assumptions.

- [x] T001 Confirm the initial room-type catalog as `private_room` (Phòng trọ riêng), `shared_room` (Phòng ở ghép), `studio` (Studio / căn hộ mini), and `apartment` (Căn hộ chung cư); exclude whole-house listings and leave existing rows null/unclassified when no reliable mapping exists. Record the contract in `src/specs/002-search-filtering/spec.md`, `src/specs/002-search-filtering/data-model.md`, `src/specs/002-search-filtering/contracts/search-api.md`, `src/specs/002-search-filtering/plan.md`, and `src/specs/002-search-filtering/research.md` (Decision confirmed by Nguyễn Hữu Nghĩa on 2026-11-16; share codes with Đặng Hiển for listing-creation integration).
- [x] T002 Retain SC-003 through SC-006 as the accepted targets: 1,000 synthetic approved listings; at least 95% of 100 documented searches display results within 3 seconds; 9 of 10 participants complete the same search task within 2 minutes; keyboard operation without horizontal scrolling at 320 CSS-pixel and 1280 CSS-pixel widths. Record the verification procedure in `src/specs/002-search-filtering/spec.md` and `src/specs/002-search-filtering/quickstart.md` (Decision confirmed by Nguyễn Hữu Nghĩa on 2026-11-16).

## Phase 2: Foundational — Room-Type Persistence

**Purpose**: Add the database contract required by all public search stories. Do not start implementation until T001 is complete.

- [x] T003 [P] Add migration/schema-state tests for exactly the T001 room-type catalog, listing relationship, uniqueness, referential integrity, and null preservation for existing listings without reliable type data in `backend/tests/schemaState.test.js` (Owner: Nguyễn Hữu Nghĩa; depends on T001).
- [x] T004 Create a new timestamped migration under `backend/migrations/` that adds the room-type catalog and listing association, seeds exactly the values in T001, leaves unclassifiable existing listings null, and preserves rollback safety (Owner: Nguyễn Hữu Nghĩa; depends on T003).
- [x] T005 Apply and verify the migration only against the isolated Roomify-Test database using the commands in `src/specs/002-search-filtering/quickstart.md`; run `npm.cmd run migrate:test` and `npm.cmd run db:check:test` from `backend/` and record results in `src/specs/002-search-filtering/quickstart.md` (Owner: Nguyễn Hữu Nghĩa; depends on T004). On 2026-11-16, preflight confirmed the separate Roomify-Test project; migration `1700000004000_search_room_types` applied, and the post-migration schema check passed.

**Checkpoint**: The shared room-type values and persistence contract are agreed, and the isolated test database has the expected schema. Never run destructive or unverified migrations against a database containing data that must be preserved.

## Phase 3: User Story 1 — Search by Keyword and Location (Priority: P1)

**Goal**: Allow visitors and tenants to search public approved listings by keyword and district, including an unfiltered search.

**Independent Test**: Prepare approved listings with distinct title/address/district values and pending/rejected listings. Verify keyword matching in title, address, and district, district selection, whitespace normalization, default results, and approved-only visibility.

### Backend tests and implementation — Owner: Nguyễn Hữu Nghĩa

- [x] T006 [P] [US1] Add service unit tests for keyword matching across title/address/district, whitespace normalization, exact district filtering, unfiltered criteria, and approved-only results in `backend/tests/listingSearchService.test.js` (Owner: Nguyễn Hữu Nghĩa; verified by unit tests).
- [x] T007 [P] [US1] Add API integration tests for anonymous search, standard response shape, approved-only visibility, and invalid listing data privacy in `backend/tests/listingSearchApi.integration.test.js` (Owner: Nguyễn Hữu Nghĩa; 4 integration tests pass against Roomify-Test after T005).
- [x] T008 [US1] Implement validated keyword/district search, approved-only filtering, public-field projection, default ordering, and the first 12-item page with total count in `backend/src/services/listingSearchService.js`; use parameterized SQL and normalize surrounding/repeated whitespace (Owner: Nguyễn Hữu Nghĩa; depends on T006; unit tests pass).
- [x] T009 [US1] Wire the public `GET /api/v1/listings` search and district-options handler into `backend/src/controllers/listingController.js` and `backend/src/routes/listingRoutes.js` while preserving the existing landlord delete route and returning the response/pagination contract (Owner: Nguyễn Hữu Nghĩa; depends on T008; mocked route and Roomify-Test integration tests pass).

### Frontend tests and implementation — Owner: Đặng Hiển

- [x] T010 [P] [US1] Add browser tests for anonymous access to `/search`, keyword submission, district selection, and default approved search results in `frontend/e2e/search-filtering.spec.js` (Owner: Đặng Hiển; targeted Playwright search suite: 10/10 passed on 2026-11-20 with mocked search responses).
- [x] T011 [US1] Add listing search calls in `frontend/src/api/listingApi.js` and create the initial keyword/district search page in `frontend/src/pages/SearchPage.jsx`; register the public `/search` route in `frontend/src/App.jsx` and preserve API pagination metadata without changing existing authentication API behavior (Owner: Đặng Hiển; depends on T010 and the contract in `contracts/search-api.md`; browser checks and production build passed on 2026-11-20).

**Checkpoint**: A visitor can search by keyword/location and view only approved results without signing in.

## Phase 4: User Story 2 — Combine Room Filters (Priority: P1)

**Goal**: Combine room type, maximum monthly price, inclusive area bounds, district, keyword, and all-required amenities.

**Independent Test**: Use approved listings with different types, prices, areas, districts, and amenity combinations. Verify each filter and combined filters return exactly the listings that satisfy every selected criterion.

### Backend tests and implementation — Owner: Nguyễn Hữu Nghĩa

- [x] T012 [P] [US2] Extend unit tests for active room-type validation, inclusive maximum price/area bounds, all-selected-amenities matching, AND combination semantics, and unsupported values in `backend/tests/listingSearchService.test.js` (Owner: Nguyễn Hữu Nghĩa; verified by unit tests).
- [x] T013 [P] [US2] Add API integration tests for filter options and combined room-type/price/area/amenity filters in `backend/tests/listingSearchApi.integration.test.js` (Owner: Nguyễn Hữu Nghĩa; 6 integration tests pass against Roomify-Test).
- [x] T014 [US2] Extend filter-options retrieval with active room types and available amenities, implement all advanced filter predicates in `backend/src/services/listingSearchService.js`, and ensure the existing filters/search handlers in `backend/src/controllers/listingController.js` and `backend/src/routes/listingRoutes.js` return only contract-defined public fields (Owner: Nguyễn Hữu Nghĩa; the existing controller/routes already provided the required public envelopes; advanced filters verified by unit and integration tests).

### Frontend tests and implementation — Owner: Đặng Hiển

- [x] T015 [P] [US2] Extend browser tests for combined filters, filter options, all-required amenity behavior, and preservation of criteria on submission in `frontend/e2e/search-filtering.spec.js` (Owner: Đặng Hiển; the browser test verifies anonymous filter usage, repeated amenity query parameters, and retained form values).
- [x] T016 [US2] Add room-type, maximum-price, minimum/maximum-area, and multi-amenity controls to `frontend/src/pages/SearchPage.jsx`; load options and serialize filters according to `frontend/src/api/listingApi.js` and `contracts/search-api.md` (Owner: Đặng Hiển; production build and complete Playwright suite pass).

**Checkpoint**: Every selected filter category is applied by the server, and combined searches match the exact expected set.

## Phase 5: User Story 3 — Recover from Empty or Failed Searches (Priority: P1)

**Goal**: Clearly distinguish empty results, invalid criteria, loading, and service failures; allow retry and clearing criteria.

**Independent Test**: Submit valid criteria with no matches, invalid area/unsupported values, and a simulated service failure. Verify distinct states, no stale results shown as current, criteria retained for retry, and clear resets all criteria.

### Backend tests and implementation — Owner: Nguyễn Hữu Nghĩa

- [x] T017 [P] [US3] Add API/service tests for minimum area greater than maximum, malformed and unsupported filters, and database/service errors returning the standard error shape in `backend/tests/listingSearchService.test.js` and `backend/tests/listingSearchApi.integration.test.js` (Owner: Nguyễn Hữu Nghĩa; unit/API error tests pass and all 12 integration cases pass against Roomify-Test).
- [x] T018 [US3] Enforce strict query validation and reject unknown or unsupported criteria without silently broadening results in `backend/src/services/listingSearchService.js`; propagate failures through existing `backend/src/middlewares/errorHandler.js` behavior (Owner: Nguyễn Hữu Nghĩa; strict Zod validation and supported-value checks already existed from T014; confirmed by malformed/unsupported criteria and standard 400/500 error-envelope tests).

### Frontend tests and implementation — Owner: Đặng Hiển

- [x] T019 [P] [US3] Add browser tests for empty results, loading, invalid-range feedback, simulated API failure, retry with preserved criteria, and clearing all criteria in `frontend/e2e/search-filtering.spec.js` (Owner: Đặng Hiển; targeted Playwright search suite: 10/10 passed on 2026-11-20 with mocked search responses).
- [x] T020 [US3] Implement distinct loading, empty, validation-error, and service-error states plus retry and clear-filter behavior in `frontend/src/pages/SearchPage.jsx`; do not present old results as current after a failed request (Owner: Đặng Hiển; depends on T019; browser checks passed on 2026-11-20).

**Checkpoint**: Empty results are not confused with failures; users can retry or revise criteria without losing them.

## Phase 6: User Story 4 — Browse Matching Results (Priority: P2)

**Goal**: Show useful public result summaries, stable 12-item pages, and navigation to approved listing details.

**Independent Test**: Prepare more than 12 matching approved listings. Verify result-card fields, correct deterministic page boundaries while preserving filters, and approved-only details without private owner/account fields.

### Backend tests and implementation — Owner: Nguyễn Hữu Nghĩa

- [x] T021 [P] [US4] Add integration tests for 12-item pagination, total count, deterministic `created_at DESC, id DESC` ordering, public result projection, approved detail lookup, and 404 for pending/rejected listings in `backend/tests/listingSearchApi.integration.test.js` (Owner: Nguyễn Hữu Nghĩa; all 14 search integration cases pass against Roomify-Test).
- [x] T022 [US4] Implement result pagination and approved listing detail reads in `backend/src/services/listingSearchService.js`, `backend/src/controllers/listingController.js`, and `backend/src/routes/listingRoutes.js`; return exactly 12 items per page and exclude owner/account and moderation-private fields (Owner: Nguyễn Hữu Nghĩa; search pagination is verified; detail route/service exposes only contract-defined public fields and is covered by approved/404 integration tests).

### Frontend tests and implementation — Owner: Đặng Hiển

- [x] T023 [P] [US4] Add browser tests for result-card summary fields, next/previous page behavior with retained criteria, navigation to listing details, keyboard operation, and narrow viewport layout in `frontend/e2e/search-filtering.spec.js` (Owner: Đặng Hiển; targeted Playwright search suite: 10/10 passed on 2026-11-20 at 320 and 1280 CSS-pixel widths).
- [x] T024 [US4] Implement listing result cards and page navigation in `frontend/src/pages/SearchPage.jsx`, add the public detail view in `frontend/src/pages/ListingDetailPage.jsx`, add its API call in `frontend/src/api/listingApi.js`, and register the public detail route in `frontend/src/App.jsx` (Owner: Đặng Hiển; depends on T023 and the detail contract in `contracts/search-api.md`; browser checks, visual review, and production build passed on 2026-11-20).

**Checkpoint**: Users can browse result pages and open an approved public listing without exposing private data.

## Phase 7: Polish and Cross-Cutting Verification

**Purpose**: Validate the complete backend/database/frontend flow and record evidence.

- [x] T025 [P] Run backend unit tests and lint with `npm.cmd run test:unit` and `npm.cmd run lint` from `backend/`; run integration tests with `npm.cmd test -- --runInBand` only against the verified Roomify-Test database, and record command/results/environment in `src/specs/002-search-filtering/quickstart.md` (Owner: Nguyễn Hữu Nghĩa; 2026-11-21: unit 572/572, integration 827/827, lint 0 errors; verification recorded).
- [x] T026 [P] Run frontend build and Playwright checks with `npm.cmd run build` and `npm.cmd run test:e2e` from `frontend/`; verify keyboard operation and the 320 CSS-pixel viewport, and record command/results/environment in `src/specs/002-search-filtering/quickstart.md` (Owner: Đặng Hiển; full Chromium suite passed 51/51 on Roomify-Test on 2026-11-21, including 320/1280 CSS-pixel keyboard and horizontal-scroll checks; see quickstart for the mocked-search limitation).
- [x] T027 Measure the SC-003 target with 1,000 synthetic approved listings in the documented isolated environment, report the environment and observed response/display percentile, and record whether the accepted target passed in `src/specs/002-search-filtering/quickstart.md` (Owner: Nguyễn Hữu Nghĩa + Đặng Hiển; completed 2026-11-25: 100/100 searches displayed within 3 seconds; p50 666.1 ms, p95 735.6 ms, p99 744.7 ms).
- [x] T028 Review `src/specs/002-search-filtering/spec.md`, `src/specs/002-search-filtering/plan.md`, `src/specs/002-search-filtering/data-model.md`, and `src/specs/002-search-filtering/contracts/search-api.md` against the implemented API/schema/UI; update any behavior or contract mismatch before marking the feature complete (Owner: Nguyễn Hữu Nghĩa + Đặng Hiển; completed 2026-11-25: reconciled province/ward filters, API-only district behavior, nullable location columns, and the listing create/update limitation).

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 and T002 resolve the shared room-type and acceptance-target decisions.
- **Foundational (Phase 2)**: Depends on T001; the room-type persistence decision and verified test migration block user-story implementation.
- **US1 (Phase 3)**: Depends on Phase 2 and the existing API contract; delivers the MVP keyword/location search.
- **US2 (Phase 4)**: Depends on Phase 2 and US1's search endpoint; adds advanced filtering.
- **US3 (Phase 5)**: Builds on the query and UI states established by US1/US2.
- **US4 (Phase 6)**: Builds on search results and filters; adds paging and public details.
- **Polish (Phase 7)**: Depends on the stories selected for delivery; T025 and T026 can run in parallel after implementation is integrated.

### User Story Dependency Graph

```text
T001 -> T002
  -> T003 -> T004 -> T005
                 -> US1 (T006/T007 -> T008 -> T009; T010 -> T011)
                 -> US2 (T012/T013 -> T014; T015 -> T016)
US1 -> US2 -> US3 -> US4 -> Polish
```

US2 depends on the shared search endpoint and migration but does not require the UI states from US3. US3 and US4 should be implemented after US2 so their tests exercise the finalized filter criteria and result shape.

### Parallel Opportunities

- After T001, migration tests (T003) can be prepared while both contributors review the backend-only migration behavior; T004 must wait for T003.
- In each story, the backend owner and frontend owner can work in their separate directories after agreeing on the API contract and test fixtures.
- Within a story, the backend unit/API tests marked `[P]` can be authored in parallel because they use different test files. The frontend browser test can also proceed independently in `frontend/`.
- T025 backend verification and T026 frontend verification can run in parallel after integration is ready. Database-backed integration tests and browser tests sharing Roomify-Test must not run concurrently if either can mutate/reset that database.

## Parallel Example: User Story 1

After Phase 2 and contract review:

```text
Nguyễn Hữu Nghĩa:
  T006 backend service tests and T007 backend API integration tests
  then T008 search service and T009 route/controller wiring

Đặng Hiển:
  T010 search browser tests
  then T011 listing API client and initial public search page
```

The contributors work in `backend/` and `frontend/` respectively. Agree on any contract change before editing [search-api.md](./contracts/search-api.md).

## MVP and Incremental Delivery

**MVP**: Phase 1, Phase 2, and User Story 1. This provides anonymous keyword/district search over approved listings and is independently testable.

**Full feature**: Add US2 advanced filters, US3 recovery states, and US4 paginated result/detail browsing, then complete Phase 7 verification. Do not claim the full functional group is complete after the MVP alone.

## Notes

- Tests are included because the project constitution requires automated coverage for API contracts and database behavior, and the feature is full-stack.
- Every task has an ID, checkbox, file path, owner, and story label where required.
- Create/synchronize Jira tasks and reviewer assignments before implementation in accordance with the project constitution.
- Use only synthetic fixtures. Do not run test-reset or migration commands against a database containing data that must be preserved.
