---
description: "Implementation tasks for Comprehensive Listing Management"
---

# Tasks: Comprehensive Listing Management

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Input**: Design documents from `src/specs/003-listing-management/`

**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [listing management API contract](./contracts/listing-management-api.md), and [quickstart.md](./quickstart.md)

---

## Team Ownership and Conflict Avoidance

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

To ensure parallel velocity and prevent git merge conflicts, file ownership is strictly segregated between contributors:

| Contributor | Role & Assigned Module | Exclusive File Ownership | Prohibited Areas |
|---|---|---|---|
| **Từ Thái Hưng (TV4)** | Backend API, Database Transactions & Testing | `backend/src/routes/listingRoutes.js`<br>`backend/src/controllers/listingController.js`<br>`backend/src/services/listingService.js`<br>`backend/tests/listingService.test.js`<br>`backend/tests/listingApi.integration.test.js`<br>`backend/tests/fixtures/listingFixtures.js` | Strictly NO edits to `frontend/` files.<br>Strictly NO edits to `backend/src/services/listingSearchService.js`. |
| **Đỗ Quốc Đại (TV3)** | Frontend UI, API Client & E2E Testing | `frontend/src/api/listingManagementApi.js`<br>`frontend/src/pages/PostListingPage.jsx`<br>`frontend/src/pages/MyListingsPage.jsx`<br>`frontend/src/pages/EditListingPage.jsx`<br>`frontend/src/components/MapLocationPicker.jsx`<br>`frontend/src/components/DeleteListingModal.jsx`<br>`frontend/src/App.jsx`<br>`frontend/e2e/landlord-*.spec.js` | Strictly NO edits to `backend/` files. |
| **Both** | Shared Specifications & Contracts | `src/specs/003-listing-management/*` (Coordinate before updates) | Adhere to [listing-management-api.md](./contracts/listing-management-api.md) as the single source of truth. |

---

## Format Guidelines

Each task strictly adheres to the Spec-Kit checklist format:
- Checkbox: `- [ ]`
- Task ID: Sequential numbering (`T001`, `T002`, `T003`...)
- `[P]` Marker: Identifies parallelizable tasks (independent files with no blocking dependencies)
- `[Story]` Label: Specifies target user story (`[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`) for story phases
- Description: Explicit action with exact relative file path and assigned owner

---

## Phase 1: Setup & Shared Infrastructure

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Purpose**: Establish test fixtures, client stubs, and baseline configuration so backend and frontend tracks can progress simultaneously without blocking.

- [X] T001 Align API contract with camelCase JSON fields (`areaM2`, `roomTypeId`, `amenityIds`, `imageUrls`, `ownerId`, `rejectReason`, `coverImageUrl`, `isCover`, `sortOrder`, `createdAt`), PostGIS spatial point syntax `ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography`, 4 room types, and image constraints in `src/specs/003-listing-management/contracts/listing-management-api.md` (Owner: Từ Thái Hưng & Đỗ Quốc Đại).
- [X] T002 [P] Create backend test fixtures and seed helpers for authenticated landlords, synthetic listings in each status (`pending`, `approved`, `rejected`), and image URLs in `backend/tests/fixtures/listingFixtures.js` (Owner: Từ Thái Hưng).
- [X] T003 [P] Initialize frontend API client module stub with standard response envelope handling in `frontend/src/api/listingManagementApi.js` (Owner: Đỗ Quốc Đại).

---

## Phase 2: Foundational Prerequisites (Blocking)

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Purpose**: Core backend validation schemas, Express route structure, and frontend landlord routing that all user stories depend upon.

- [X] T004 Implement Zod validation schemas (`createListingSchema`, `updateListingSchema`, `queryMineSchema`) with `.strict()` using camelCase property keys in `backend/src/services/listingService.js` and prepare Express route ordering in `backend/src/routes/listingRoutes.js` ensuring `GET /mine` and `GET /mine/:id` are declared above `GET /:id` (Owner: Từ Thái Hưng; depends on T001).
- [X] T005 [P] Setup landlord private route guards and navigation links for `/landlord/listings`, `/landlord/listings/create`, and `/landlord/listings/:id/edit` in `frontend/src/App.jsx` (Owner: Đỗ Quốc Đại; depends on T003).

**Checkpoint**: Foundation ready. User story development can proceed in parallel across backend and frontend.

---

## Phase 3: User Story 1 — Create and Submit a New Boarding House Listing (Priority: P1) 🎯 MVP

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Goal**: Authenticated landlords can draft and submit a complete boarding house listing with pricing, area, 1–10 photo URLs, amenities, and room type, saving it in `pending` status for admin moderation (UC-13).

**Independent Test**: Submit a complete listing payload using a valid landlord token. Verify database persistence in `listings` with `status = 'pending'`, `reject_reason = null`, `listing_images` with cover set at index 0, and non-appearance in public search results.

### Backend Implementation & Verification (Owner: Từ Thái Hưng)

- [X] T006 [P] [US1] Add unit tests in `backend/tests/listingService.test.js` verifying `createListing` transaction: user row lock (`users` FOR UPDATE), `is_active` check, `landlord` role check, room type foreign key validation against active catalog, photo URL bounds (1 to 10 URLs), PostGIS point calculation, and initial status `pending`.
- [X] T007 [P] [US1] Add API integration tests for `POST /api/v1/listings` in `backend/tests/listingApi.integration.test.js` testing 201 Created response envelope, 401 Unauthorized, 403 Forbidden (for tenant role or disabled landlord), and 400 Bad Request on invalid payloads.
- [X] T008 [US1] Implement `createListing(actorId, input)` in `backend/src/services/listingService.js` using a dedicated pooled client transaction (`BEGIN ... COMMIT / ROLLBACK`), user lock, PostGIS geometry insertion `ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography`, batch insertion into `listing_images` (`is_cover = (index === 0)`), and insertion into `listing_amenities` (depends on T006, T007).
- [X] T009 [US1] Implement `create` handler in `backend/src/controllers/listingController.js` and expose `POST /api/v1/listings` with `requireAuth` and `requireRole('landlord')` in `backend/src/routes/listingRoutes.js`, returning HTTP 201 via `sendSuccess(res, result, 201)` (depends on T008).

### Frontend Implementation & Verification (Owner: Đỗ Quốc Đại)

- [X] T010 [P] [US1] Add Playwright E2E tests for the listing creation workflow in `frontend/e2e/landlord-create-listing.spec.js` covering field validation errors, successful submission, and redirection to My Listings.
- [X] T011 [US1] Add `createListing(data)` API method in `frontend/src/api/listingManagementApi.js` and build the Post Listing page with inputs for title, description, price, areaM2, roomTypeId, amenities checklist, and dynamic image URL inputs (1 to 10 photos) in `frontend/src/pages/PostListingPage.jsx` (depends on T010).

**Checkpoint**: User Story 1 (MVP) complete and independently testable end-to-end.

---

## Phase 4: User Story 2 — Pinpoint and Select Exact Location on Interactive Map (Priority: P1)

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Goal**: Landlords can search addresses, place and drag a pin on an interactive map, and confirm accurate geographic coordinates (lat/lng with $\ge 6$ decimal places) for listing creation and editing (UC-14).

**Independent Test**: Open map picker, search or drag pin, confirm selection, and verify that the coordinates and address fields in the listing form are populated and valid for submission.

### Backend Implementation & Verification (Owner: Từ Thái Hưng)

- [X] T012 [P] [US2] Add spatial coordinate boundary and precision tests in `backend/tests/listingService.test.js` validating latitude $[-90, 90]$, longitude $[-180, 180]$, PostGIS `(lng, lat)` order, and 6-decimal-place precision retention.

### Frontend Implementation & Verification (Owner: Đỗ Quốc Đại)

- [X] T013 [P] [US2] Add Playwright E2E tests for the map picker modal in `frontend/e2e/landlord-map-picker.spec.js` validating modal opening, address search query, pin dragging, coordinate updating, and confirmation passing data to form fields.
- [X] T014 [US2] Implement `MapLocationPicker.jsx` modal component in `frontend/src/components/MapLocationPicker.jsx` using Google Maps JavaScript API (or Leaflet), support address autocomplete, draggable marker pin, reverse geocoding, and integrate with `frontend/src/pages/PostListingPage.jsx` and `frontend/src/pages/EditListingPage.jsx` (depends on T013).

**Checkpoint**: User Story 2 complete. Landlords can visually select map locations and submit listings with verified PostGIS coordinates.

---

## Phase 5: User Story 3 — View, Filter, and Monitor Landlord's Own Listings (Priority: P1)

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Goal**: Landlords can view their listing portfolio across all moderation statuses (`pending`, `approved`, `rejected`), filter by status, view summary counters, and read admin rejection reasons (UC-15).

**Independent Test**: Authenticate as a landlord with listings in various statuses and query `GET /api/v1/listings/mine`. Verify that only the landlord's own listings are returned, summary counts match in `data.summary`, status filter tabs function, and rejection reasons are fully legible.

### Backend Implementation & Verification (Owner: Từ Thái Hưng)

- [X] T015 [P] [US3] Add unit tests in `backend/tests/listingService.test.js` for `getLandlordListings`: ownership isolation (`owner_id = actorId`), descending ordering by `created_at DESC`, status query filtering, and summary counts (`total`, `pending`, `approved`, `rejected`) in the `{ listings, summary }` return shape.
- [X] T016 [P] [US3] Add API integration tests for `GET /api/v1/listings/mine` and `GET /api/v1/listings/mine/:id` in `backend/tests/listingApi.integration.test.js` testing `sendSuccess` envelope with `data.listings` and `data.summary`, full photos and amenities arrays, exclusion of other landlords' data, status filtering, and rejection reason presence.
- [X] T017 [US3] Implement `getLandlordListings(actorId, query)` and `getLandlordListingById(actorId, listingId)` in `backend/src/services/listingService.js` returning camelCase objects, joined `roomType`, full `images`, and `amenities` lists, plus parallel aggregate query for status counts (depends on T015, T016).
- [X] T018 [US3] Implement `mine` and `mineDetail` handlers in `backend/src/controllers/listingController.js` and register `router.get('/mine', requireAuth, requireRole('landlord'), controller.mine)` and `router.get('/mine/:id', requireAuth, requireRole('landlord'), requireOwnership, controller.mineDetail)` in `backend/src/routes/listingRoutes.js` strictly placed ABOVE `GET /:id` (depends on T017).

### Frontend Implementation & Verification (Owner: Đỗ Quốc Đại)

- [X] T019 [P] [US3] Add Playwright E2E tests for the "My Listings" management screen in `frontend/e2e/landlord-my-listings.spec.js` testing status tab switches, summary counter displays, empty states, and rejection note banners.
- [X] T020 [US3] Add `getMyListings(status)` and `getMyListingById(id)` API methods in `frontend/src/api/listingManagementApi.js` and build the My Listings dashboard with status filter tabs, summary badges, listing cards, rejection note alerts, and empty state CTA in `frontend/src/pages/MyListingsPage.jsx` (depends on T019).

**Checkpoint**: User Story 3 complete. Landlords have full transparency into their portfolio and moderation feedback.

---

## Phase 6: User Story 4 — Edit Existing Listing and Trigger Moderation Reset (Priority: P2)

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Goal**: Landlords can modify an owned listing; submitting substantive changes updates data, automatically resets `status` to `'pending'`, clears `rejectReason`, and suspends public search until re-approved (UC-16).

**Independent Test**: Load existing listing via `GET /mine/:id`, modify an approved or rejected listing owned by the landlord. Verify that upon save, `status` becomes `'pending'`, `rejectReason` is set to `null`, and the listing is excluded from public search results. Verify no-op updates preserve status.

### Backend Implementation & Verification (Owner: Từ Thái Hưng)

- [X] T021 [P] [US4] Add unit tests in `backend/tests/listingService.test.js` for `updateOwnedListing`: user lock, listing lock (`FOR UPDATE`), ownership check (`owner_id === actorId`), no-op detection, substantive update triggering `status = 'pending'` and `reject_reason = NULL`, and image array replacement.
- [X] T022 [P] [US4] Add API integration tests for `PATCH /api/v1/listings/:id` in `backend/tests/listingApi.integration.test.js` testing 200 OK, 403 Forbidden for non-owners, 404 Not Found, 400 Validation Error, and verified removal of edited approved listings from public search results.
- [X] T023 [US4] Implement `updateOwnedListing(actorId, listingId, input)` in `backend/src/services/listingService.js` with atomic transaction, user/listing locking, dynamic parameterized SQL update with camelCase inputs, PostGIS point re-calculation, automatic status reset to `'pending'`, clearing `reject_reason = NULL`, and transactional image replacement (depends on T021, T022).
- [X] T024 [US4] Implement `update` handler in `backend/src/controllers/listingController.js` and register `router.patch('/:id', requireAuth, requireRole('landlord'), requireOwnership, controller.update)` in `backend/src/routes/listingRoutes.js` (depends on T023).

### Frontend Implementation & Verification (Owner: Đỗ Quốc Đại)

- [X] T025 [P] [US4] Add Playwright E2E tests for listing modification in `frontend/e2e/landlord-edit-listing.spec.js` covering data pre-population from `getMyListingById`, re-moderation notice banner, form editing, and successful update redirect.
- [X] T026 [US4] Add `updateListing(id, data)` API method in `frontend/src/api/listingManagementApi.js` and build the Edit Listing page in `frontend/src/pages/EditListingPage.jsx` loading owned listing data via `getMyListingById(id)`, displaying re-moderation warning alert, and integrating `MapLocationPicker.jsx` (depends on T025).

**Checkpoint**: User Story 4 complete. Landlords can modify listings with guaranteed administrative re-moderation.

---

## Phase 7: User Story 5 — Permanently Delete an Owned Listing (Priority: P2)

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Goal**: Landlords can permanently delete an owned listing with a confirmation dialog, cascading deletion across child records in the database (UC-17).

**Independent Test**: Click delete on an owned listing, confirm the modal, and verify that the listing is permanently deleted from `listings`, child records in `listing_images`, `listing_amenities`, and `favorites` are removed, and the listing vanishes from "My Listings".

### Backend Verification (Owner: Từ Thái Hưng)

- [X] T027 [P] [US5] Add integration tests in `backend/tests/listingApi.integration.test.js` verifying the existing `DELETE /api/v1/listings/:id` endpoint: 200 OK, cascading removal of associated rows in `listing_images`, `listing_amenities`, and `favorites`, 403 Forbidden on non-owned listings, and 404 on missing listings.

### Frontend Implementation & Verification (Owner: Đỗ Quốc Đại)

- [X] T028 [P] [US5] Add Playwright E2E tests for the deletion flow in `frontend/e2e/landlord-delete-listing.spec.js` testing confirmation modal display, cancel dismiss, and confirmed deletion removing the item from the UI.
- [X] T029 [US5] Add `deleteListing(id)` API method in `frontend/src/api/listingManagementApi.js` and implement `DeleteListingModal.jsx` confirmation dialog in `frontend/src/components/DeleteListingModal.jsx` integrated into `MyListingsPage.jsx` (depends on T028).

**Checkpoint**: User Story 5 complete. Landlords can permanently remove listings with full cascade cleanup.

---

## Phase 8: Polish, Cross-Cutting & Verification

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Purpose**: Execute end-to-end regression testing, performance validation, and documentation updates across both subsystems.

- [X] T030 [P] Execute backend test commands (`npm.cmd run lint`, `npm.cmd run test:unit`, and `npm.cmd test -- --runInBand`) against Roomify-Test and record clean pass results (Owner: Từ Thái Hưng).
- [X] T031 [P] Execute full frontend Playwright suite (`npx playwright test frontend/e2e/landlord-*.spec.js`) and verify responsive layout at 320px and 1280px viewports (Owner: Đỗ Quốc Đại).
- [X] T032 Complete full lifecycle verification walkthrough (Create listing -> View in My Listings -> Edit -> Verify status reset to Pending -> Delete) per [quickstart.md](./quickstart.md) and confirm zero regressions in `listingSearchService.js` (Owner: Từ Thái Hưng & Đỗ Quốc Đại; depends on T030, T031).

---

## Dependencies & Execution Order

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

### Phase Dependencies
- **Phase 1 (Setup)**: Can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion. Blocks all User Story implementation.
- **Phase 3 (User Story 1 - MVP)**: Depends on Phase 2. Can be developed and deployed as MVP.
- **Phase 4 (User Story 2 - Map Picker)**: Can run in parallel with or after US1.
- **Phase 5 (User Story 3 - My Listings)**: Can run in parallel with US1/US2.
- **Phase 6 (User Story 4 - Edit Listing)**: Depends on US1 (creation payload reuse) and US3 (entry point & `GET /mine/:id` detail).
- **Phase 7 (User Story 5 - Delete Listing)**: Depends on US3 (entry point). Backend delete endpoint already exists.
- **Phase 8 (Polish & Verification)**: Depends on completion of all desired user stories.

### Parallel Opportunities by Contributor
- **Backend Track (Từ Thái Hưng)**:
  - T002 (Fixtures) runs in parallel with T003 (Frontend Client stub).
  - T006, T007 (Unit/API tests for US1) run in parallel with frontend test authoring T010.
  - T012 (Spatial tests) runs in parallel with T015, T016 (US3 tests).
  - T021, T022 (US4 tests) run in parallel with T027 (US5 tests).
- **Frontend Track (Đỗ Quốc Đại)**:
  - T010, T013, T019, T025, T028 (Playwright E2E test suites) can be authored in parallel against mock API contracts.
  - `MapLocationPicker.jsx` (T014) can be developed independently of backend services.
  - `PostListingPage.jsx` (T011) and `MyListingsPage.jsx` (T020) can proceed concurrently once API contracts are fixed.

---

## Implementation Strategy

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

### MVP Delivery (User Story 1 & 3)
1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1 - Create Listing) and Phase 5 (US3 - View My Listings).
3. **Validate MVP**: Landlords can create listings with initial `pending` status and view them on their dashboard.

### Full Feature Increment
1. Add Phase 4 (US2 - Interactive Map Pinpoint).
2. Add Phase 6 (US4 - Edit with Moderation Reset via `GET /mine/:id` and `PATCH /:id`).
3. Add Phase 7 (US5 - Delete with Cascade).
4. Run Phase 8 (Polish, Lint & Quickstart Validation).
