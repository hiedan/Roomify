# Implementation Plan: Comprehensive Listing Management

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Branch**: `003-listing-management` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `src/specs/003-listing-management/spec.md`

---

## Summary

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

Deliver the full lifecycle management capabilities for landlord boarding house listings on Roomify across UC-13 (Post Listing), UC-14 (Select Location on Map), UC-15 (View My Listings), UC-16 (Edit Listing), and UC-17 (Delete Listing).

The technical implementation directly extends the existing backend files (`backend/src/routes/listingRoutes.js`, `backend/src/controllers/listingController.js`, and `backend/src/services/listingService.js`) using pure Node.js CommonJS (Node 18+, no TypeScript), Express 4, Zod with `.strict()`, `pg`, and Jest + Supertest. Public search service `listingSearchService.js` remains completely untouched.

Key architectural behaviors:
1. All JSON API requests and responses use `camelCase` identifiers (`areaM2`, `roomTypeId`, `amenityIds`, `imageUrls`, `ownerId`, `rejectReason`, `coverImageUrl`, `isCover`, `sortOrder`, `createdAt`), mapped cleanly to PostgreSQL `snake_case` table columns.
2. Route ordering in `listingRoutes.js` strictly places `GET /mine` and `GET /mine/:id` above `GET /:id` to prevent Express from treating the literal string `'mine'` as an ID parameter.
3. The landlord portfolio endpoint `GET /api/v1/listings/mine` returns Roomify's standard `sendSuccess(res, data)` envelope: `{ success: true, data: { listings: [...], summary: { total, pending, approved, rejected } } }`, including full description, photo images array, and amenities for each item.
4. The dedicated endpoint `GET /api/v1/listings/mine/:id` allows the owning landlord to load full listing details to pre-populate `EditListingPage` (UC-16) regardless of moderation status (`pending`, `approved`, `rejected`).
5. In-flight state-mutating requests (`POST`, `PATCH`, `DELETE`) follow the existing pessimistic locking pattern: acquire a dedicated client, begin an explicit transaction, lock the actor row in `users` (`FOR UPDATE`) to verify active `landlord` status, and then lock target rows in `listings` (`FOR UPDATE`) to verify ownership.
6. Coordinates are stored in `lat`, `lng`, and spatial column `geom` generated via `ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography` (longitude first, latitude second).
7. Room types are validated against the 4 established catalog codes (`private_room`, `shared_room`, `studio`, `apartment`) from migration `1700000004000_search_room_types.js`.
8. Modifying an existing listing (`PATCH /api/v1/listings/:id`) automatically reverts its status to `'pending'`, clears `rejectReason` to `null`, and hides it from public search until re-approved by an administrator.

---

## Technical Context

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Language/Version**: JavaScript, Node.js 18+ (pure CommonJS, strictly NO TypeScript).

**Primary Dependencies**: Express 4, Zod (.strict()), `pg` (node-postgres), Jest, Supertest.

**Storage**: PostgreSQL with PostGIS extension (PostGIS Point 4326); reuses existing schema from `1700000000000_init.js` and `1700000004000_search_room_types.js` with zero new database migrations.

**Testing**: Linting with `npm.cmd run lint`, unit tests with `npm.cmd run test:unit`, and integration tests with `npm.cmd test -- --runInBand` targeting the isolated Roomify-Test Supabase project (`TEST_DATABASE_URL`, `TEST_SUPABASE_PROJECT_REF`).

**Target Platform**: Node.js 18+ REST API server (`PORT=3000`).

**Project Type**: Web service / Backend REST API.

**Performance Goals**:
- Listing creation (`POST`) completes and persists across `listings`, `listing_images`, and `listing_amenities` within 250ms.
- "My Listings" queries (`GET /mine`) with status filtering return in under 500ms for landlord portfolios of up to 500 listings.
- Zero dangling foreign keys or uncommitted rows upon transaction rollback.

**Constraints**:
- Strict CommonJS (`require` / `module.exports`).
- All JSON fields in camelCase (`areaM2`, `roomTypeId`, `amenityIds`, `imageUrls`, `ownerId`, `rejectReason`, `coverImageUrl`, `isCover`, `sortOrder`, `createdAt`).
- Extend existing `listingRoutes.js`, `listingController.js`, and `listingService.js`. Never touch `listingSearchService.js`.
- Express route registration order: `GET /mine` and `GET /mine/:id` must precede `GET /:id`.
- PostGIS point construction: `ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography` with `$lng` first, `$lat` second.
- Transaction lock order: `users` FOR UPDATE first, then `listings` FOR UPDATE.
- Re-moderation trigger: any substantive update resets `status = 'pending'` and `rejectReason = null`.
- Image URLs: array of 1 to 10 valid HTTP/HTTPS URLs; first image is cover.
- Re-use `databaseId.js`, `AppError.js`, and `response.js`.
- JWT Secret length: minimum 32 UTF-8 bytes required.

**Scale/Scope**: Covers UC-13 to UC-17 for authenticated landlords. Moderation review actions (UC-18, UC-19, UC-20) belong to the Admin functional group.

---

## Constitution Check

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

*GATE: Evaluated against Roomify Constitution.*

- **I. User-Centered Design — Pass**: Directly fulfills landlord management requirements (UC-13 to UC-17) with clear feedback on rejection reasons, status filtering, and map coordinate accuracy.
- **II. Code Quality and Maintainability — Pass**: Modifies only existing listing controller, route, and service modules without adding redundant layers or introducing TypeScript into a CommonJS codebase. JSON fields follow camelCase standards from `docs/coding-standards.md`.
- **III. Test-First and Verification — Pass**: Automated tests with Jest and Supertest (`npm.cmd run test:unit`, `npm.cmd test`) cover normal flows, boundaries (0 vs 1 vs 10 vs 11 images, latitude bounds), error paths (unauthorized, forbidden, inactive account), and transaction rollbacks.
- **IV. Consistent Architecture and Integration — Pass**: Adheres to the established database schema without adding new columns, preserves the four unified room types, uses existing response envelopes (`sendSuccess`), and reuses pre-existing `DELETE /api/v1/listings/:id`.
- **V. Security and Data Integrity — Pass**: Reuses `requireAuth`, `requireRole('landlord')`, and `requireOwnership`. In-flight operations check fresh database state using row locks (`FOR UPDATE`), and operations are isolated so landlords can only view, modify, or delete their own listings.

---

## Project Structure

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

### Documentation (this feature)

```text
src/specs/003-listing-management/
├── spec.md                             # Feature specification
├── plan.md                             # This implementation plan
├── research.md                         # Technical decisions & research
├── data-model.md                       # Data dictionary, camelCase mapping & state transitions
├── quickstart.md                       # Verification scenarios & test run guide
├── checklists/
│   └── requirements.md                 # Specification quality checklist
└── contracts/
    └── listing-management-api.md       # API contract for all endpoints in camelCase
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── routes/
│   │   └── listingRoutes.js            # Add POST /, GET /mine, GET /mine/:id (above /:id), PATCH /:id
│   ├── controllers/
│   │   └── listingController.js        # Add create, mine, mineDetail, update handlers
│   ├── services/
│   │   ├── listingService.js           # Add createListing, getLandlordListings, getLandlordListingById, updateOwnedListing
│   │   └── listingSearchService.js     # STRICTLY UNTOUCHED (public search only)
│   ├── middlewares/
│   │   └── auth.js                     # Reused: requireAuth, requireRole, requireOwnership
│   └── utils/
│       ├── databaseId.js               # Reused: isDatabaseId
│       ├── AppError.js                 # Reused: standardized errors
│       └── response.js                 # Reused: sendSuccess, sendPaginated
└── tests/
    ├── listingService.test.js          # Unit tests for listing service transactions
    └── listingApi.integration.test.js  # Integration tests for listing endpoints
```

---

## Complexity Tracking

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

No constitutional violations or unnecessary architectural layers are introduced.
All functionality is achieved within the existing 3-tier architecture (Router -> Controller -> Service/DB) without extra libraries.

---

## Implementation Gates

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

1. **Pre-Design Gate**: Technical context, constitution check, and research decisions complete with zero unresolved markers. (Passed)
2. **Design Gate**: Data model, contracts, and quickstart guide verified against spec requirements and use cases, with all JSON attributes in camelCase. (Passed)
3. **Execution Gate**: Implementation in `tasks.md` will strictly extend the designated files, place `GET /mine` and `GET /mine/:id` before `GET /:id`, use `ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography`, enforce row-level locking, and verify all Jest/Supertest integration cases with `npm.cmd run test:unit` and `npm.cmd test`.
