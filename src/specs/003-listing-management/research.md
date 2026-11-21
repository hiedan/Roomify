# Research: Comprehensive Listing Management

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Date:** 2026-11-20

**Feature**: [spec.md](./spec.md)

---

## Decision 1: Direct In-Place Extension of Existing Backend Files

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Decision**: Extend the existing backend files `backend/src/routes/listingRoutes.js`, `backend/src/controllers/listingController.js`, and `backend/src/services/listingService.js` directly in pure Node.js CommonJS (Node 18+, no TypeScript). Keep `backend/src/services/listingSearchService.js` strictly untouched.

**Rationale**:
- The repository is organized around clear modular separation: `listingSearchService.js` handles public, read-only search and filtering queries (feature `002-search-filtering`), whereas `listingService.js` handles state-mutating landlord operations (feature `003-listing-management`).
- Modifying `listingSearchService.js` would violate SRP (Single Responsibility Principle) and risk introducing regressions into public search flows.
- Keeping pure CommonJS (`require` / `module.exports`) preserves runtime uniformity across the existing Express application and test harness.

**Alternatives considered**:
- *Creating a separate router/controller such as `landlordListingRoutes.js`*: Rejected because the REST resource path is canonically `/api/v1/listings`, and existing architectural rules in the project favor a unified resource router.
- *Introducing TypeScript or ESM*: Rejected by strict technical constraints; the entire codebase uses CommonJS.

---

## Decision 2: Express 4 Route Ordering to Prevent Parameter Collisions

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Decision**: Explicitly register `router.get('/mine', ...)`, `router.get('/mine/:id', ...)`, and `router.get('/filters', ...)` before `router.get('/:id', ...)` in `backend/src/routes/listingRoutes.js`.

**Rationale**:
- In Express 4, route registration order determines routing resolution.
- If `router.get('/:id', ...)` were defined above `router.get('/mine', ...)`, incoming requests to `GET /api/v1/listings/mine` would match `:id = 'mine'`. Because `'mine'` is not a valid BIGINT identifier, `isDatabaseId('mine')` would fail or trigger unexpected errors before reaching the landlord portfolio handler.
- Placing static and specialized sub-paths (`/filters`, `/mine`, `/mine/:id`) strictly above dynamic parameterized paths (`/:id`) guarantees deterministic matching.

**Alternatives considered**:
- *Using regex path constraint on `/:id(\\d+)`*: Valid in Express, but ordering static and specialized paths first is idiomatic in Node.js/Express, self-documenting, and requires no fragile regex configurations.

---

## Decision 3: Atomic Transactions with User-First `FOR UPDATE` Row Locking

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Decision**: Replicate the exact transaction and pessimistic locking structure established in `listingService.deleteOwnedListing`:
1. Connect dedicated client: `const client = await pool.connect()`
2. Begin transaction: `await client.query('BEGIN')`
3. Lock actor record in `users`:
   ```sql
   SELECT role, is_active FROM users WHERE id = $1 FOR UPDATE
   ```
4. Verify user exists, `is_active === true`, and `role === 'landlord'`.
5. For update operations (`PATCH`): Lock listing record in `listings`:
   ```sql
   SELECT owner_id, status, ... FROM listings WHERE id = $1 FOR UPDATE
   ```
   Verify listing exists and `listing.owner_id === actorId`.
6. Perform mutations (insert/update listings, replace images, replace amenities).
7. Commit: `await client.query('COMMIT')`
8. Release client in `finally` block with rollback on error.

**Rationale**:
- Prevents race conditions where an administrator disables a landlord account or alters roles concurrently while a listing creation/edit transaction is in flight.
- Enforces consistent lock acquisition order (`users` before `listings`), preventing database deadlocks.
- Guarantees atomicity: if writing images or amenity mappings fails, the entire listing operation is rolled back with zero orphaned rows.

**Alternatives considered**:
- *Optimistic concurrency control with version column*: Rejected because the schema does not have a version column, and the project constitution forbids adding new schema columns.
- *Relying solely on middleware checks without database transactions*: Rejected because middleware captures an earlier snapshot that can be invalidated prior to query execution.

---

## Decision 4: PostGIS Point Geometry Generation with Proper Coordinate Order

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Decision**: Construct the PostGIS `geom` column using `ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography`, ensuring longitude is passed as the first parameter and latitude as the second parameter.

**Rationale**:
- PostGIS follows the spatial standard `(X, Y)` where $X$ is longitude (`lng`, range $[-180, 180]$) and $Y$ is latitude (`lat`, range $[-90, 90]$).
- Inverting the parameters (`ST_MakePoint(lat, lng)`) corrupts spatial queries, causes distance calculations in `nearby_places` to fail, and triggers PostGIS bounds exceptions when latitude exceeds 90.
- Explicitly casting to `::geography` matches the `geography(Point,4326)` column specification created in migration `1700000000000_init.js`.

**Alternatives considered**:
- *Using `ST_GeomFromText` string formatting*: Rejected because `ST_MakePoint` is faster, parameterized, and avoids string interpolation vulnerabilities.

---

## Decision 5: Listing Image Management via URL Array and Child Row Replacement

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Decision**: Validate `imageUrls` in camelCase JSON payloads as an array of 1 to 10 valid URL strings. In database operations:
- For creation (`POST`): Insert records into `listing_images` with `is_cover = true` (`isCover = true`) for index 0 and `is_cover = false` for subsequent indices, setting `sort_order = index`.
- For modification (`PATCH`): When `imageUrls` is supplied in the request body, delete existing `listing_images` for the listing and re-insert the updated array within the same transaction.

**Rationale**:
- Matches the requirement: "Ảnh phòng trọ gửi lên dưới dạng mảng URL hợp lệ (từ 1 đến 10 ảnh)" while adhering to camelCase JSON standards in `docs/coding-standards.md`.
- Using atomic child row replacement simplifies client synchronization: landlords can reorder, add, or remove photos in the UI, and the server cleanly mirrors the submitted state.
- Foreign key cascade is already configured, but explicit transactional replacement keeps image order and cover status deterministic.

**Alternatives considered**:
- *Separate image upload endpoints (`POST /listings/:id/images`)*: Rejected because the feature scope specifies submitting listings with image URL arrays directly in the listing payload.

---

## Decision 6: Moderation Re-Approval Triggers on Listing Modification

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Decision**: When an update (`PATCH /api/v1/listings/:id`) modifies any substantive listing attribute (title, description, price, area, address, district, coordinates, room type, amenities, or images):
1. The listing's `status` is automatically set to `'pending'`.
2. The `reject_reason` column is automatically set to `NULL`.
3. The `reviewed_by` and `reviewed_at` columns are reset to `NULL`.
4. If no substantive fields are modified (no-op request), the current status and rejection reason are preserved without triggering an unnecessary reset.

**Rationale**:
- In accordance with Roomify moderation rules and UC-16, landlords must not bypass administrative approval by editing an already approved listing to insert deceptive or illicit content.
- Clearing `reject_reason` allows landlords to address prior feedback, signaling to administrators that a previously rejected listing has been revised and is ready for fresh review.

**Alternatives considered**:
- *Always resetting to `pending` even if no fields changed*: Rejected because idempotent or accidental "Save" clicks without modifications should not needlessly take down an approved listing.

---

## Decision 7: Reuse of Established Helpers and Middleware

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Decision**: Leverage existing utility modules and middleware without introducing new abstractions:
- `backend/src/middlewares/auth.js`: `requireAuth`, `requireRole('landlord')`, `requireOwnership`
- `backend/src/utils/databaseId.js`: `isDatabaseId`
- `backend/src/utils/AppError.js`: Standardized application error throwing
- `backend/src/utils/response.js`: `sendSuccess`, `sendPaginated`, `sendCreated` (if available or standard `sendSuccess(res, data, 201)`)
- `zod`: Request payload parsing with `.strict()` to reject unsupported fields.

**Rationale**:
- Preserves code consistency across the backend, minimizing surface area for bugs and adhering to Principle II (Code Quality and Maintainability).
