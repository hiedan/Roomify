# Implementation Plan: Search and Filtering

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

**Branch**: `Nghia` | **Feature**: `002-search-filtering` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `src/specs/002-search-filtering/spec.md`

## Summary

Provide a public, responsive search experience at `/search` for approved Roomify listings. Visitors and tenants can search title, address, and district text, filter by province/city and optionally a ward/commune/special zone, combine those criteria with room type, maximum price, area, and amenity filters, and browse stable 12-item pages. The UI obtains the post-merger province/ward catalog from `shared/vietnam-administrative-units.json`; the backend validates the same codes and filters the nullable listing columns. District remains searchable by keyword; the API retains an exact district query parameter, but the current UI has no separate district selector. The implementation extends the existing React/Vite frontend and Express/PostgreSQL backend with public listing-search, filter-options, and approved-listing detail reads. Versioned migrations add the room-type catalog and the nullable province/ward listing columns. Search queries must use validated, parameterized filters and return only explicitly selected public listing fields.

The repository does not currently have public listing-read routes, a search page, or a listing-detail page. The plan therefore includes a minimal public detail view for the result-card navigation required by the specification; listing creation and moderation workflows remain out of scope. The feature owner has confirmed the room-type catalog; share the same codes with the listing-creation owner before implementing the migration or UI options.

## Technical Context

**Language/Version**: JavaScript, Node.js 18+ (backend CommonJS; frontend ES modules/JSX)

**Primary Dependencies**: Express 4, Zod, `pg`, node-pg-migrate, React 18, React Router 6, Vite 5

**Storage**: Supabase-hosted PostgreSQL with PostGIS; schema changes use backend node-pg-migrate scripts

**Testing**: Jest and Supertest for backend unit/API/database integration; Playwright for browser flows

**Target Platform**: Responsive web application and public REST API

**Project Type**: Full-stack web application

**Performance Goals**: Meet the accepted spec SC-003 target: with 1,000 approved listings, at least 95% of valid searches display the first page within 3 seconds in the documented verification environment.

**Constraints**: Search is public and limited to administrator-approved listings; page size is 12; ordering is `created_at DESC, id DESC`; queries must be parameterized; response fields must not expose private account or landlord data. A ward code requires a matching parent province code. Validate province/ward codes against the shared catalog; leave unverified legacy location codes null rather than guessing. Use the confirmed room-type catalog and leave unclassifiable existing room types null rather than guessing. Listing create/update endpoints currently do not write province/ward codes, so test fixtures must explicitly assign verified codes when exercising those filters.

**Scale/Scope**: Search and browse 1,000 prepared approved listings; include province/ward and catalog filter metadata, result paging, public result cards, and a minimal approved-listing detail view. Exclude listing creation/administration, interactive maps, favorites, messaging, availability status, and AI recommendations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. User-Centered Design — Pass**: The plan traces to public room discovery requirements and includes loading, empty, validation-error, service-error, keyboard, and responsive states.
- **II. Code Quality and Maintainability — Pass**: The feature follows the existing Express routes/controllers/services and React/Vite conventions and introduces no new runtime dependency.
- **III. Test-First and Verification — Pass**: The design defines API, database, and browser validation for normal flows, boundaries, invalid input, and failures. The 1,000-listing performance target will be measured and reported rather than inferred from unit tests.
- **IV. Consistent Architecture and Integration — Pass with coordination gate**: API contracts and versioned database migrations are required. The shared room-type and administrative-location catalogs are defined. Leave legacy room types and unverified location codes null; the current listing create/update API does not populate province/ward codes, so search fixtures must assign verified codes explicitly.
- **V. Security and Data Integrity — Pass**: Search remains read-only and public, only approved listings are eligible, input is validated and parameterized, and public responses use explicit field projections without account/owner records.

No constitutional violation requires an exception. The room-type agreement is a dependency, not a waiver.

**Post-design review**: Pass. The selected schema migration, public API projections, and verification plan follow the same five principles; coordinated use of the room-type catalog by listing creation remains an integration responsibility.

## Project Structure

### Documentation (this feature)

```text
src/specs/002-search-filtering/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── search-api.md
└── tasks.md              # Generated by the Spec Kit tasks phase
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── controllers/
│   │   └── listingController.js
│   ├── routes/
│   │   └── listingRoutes.js
│   └── services/
│       └── listingSearchService.js
├── migrations/
│   ├── <timestamp>_search_room_types.js
│   └── <timestamp>_listing_administrative_units.js
└── tests/
    ├── listingSearchService.test.js
    └── listingSearchApi.integration.test.js
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── SearchPage.jsx
│   │   └── ListingDetailPage.jsx
│   └── api/
│       └── listingApi.js
└── e2e/
    └── search-filtering.spec.js
shared/
└── vietnam-administrative-units.json
```

**Structure Decision**: Extend the existing backend listing route and add a focused search service, keeping query validation and SQL access in the backend. Add public search/detail UI and API calls to the existing React application. Use the existing migration, test, API error-envelope, and browser-test infrastructure; do not create a separate application or duplicate the current listing route.

## Complexity Tracking

No constitutional violations or additional architectural layers are proposed.

## Implementation Gates

1. Use the confirmed room-type codes: `private_room`, `shared_room`, `studio`, and `apartment`. Share them with listing creation; leave existing listings unclassified if no reliable mapping exists.
2. Use verified province/ward codes from `shared/vietnam-administrative-units.json`; a ward requires its parent province. The API search can filter those fields, but listing create/update does not populate them, so verified test data must be assigned explicitly.
3. Verify the accepted performance/usability targets in the documented synthetic test environment.
4. This feature exposes public filter catalogs and reads room-type/location codes; it does not implement listing creation or populate province/ward codes through the landlord write API.
