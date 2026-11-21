# Feature Specification: Comprehensive Listing Management

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Working Git Branch**: Not assigned | **Spec Kit Feature Directory**: `src/specs/003-listing-management/`

**Created**: 2026-11-20

**Status**: Ready for implementation planning

**Input**: User description: "Viết tài liệu đặc tả bằng tiếng Anh cho chức năng Comprehensive Listing Management (Nhóm chức năng 3: UC-13 Đăng tin, UC-14 Chọn vị trí trên bản đồ, UC-15 Xem tin đăng của tôi, UC-16 Sửa tin đăng, UC-17 Xóa tin đăng). Yêu cầu & bối cảnh bắt buộc: Tham khảo docs/PA3 - use-case specification/UseCaseSpecification.md (UC-13 đến UC-17). Đồng bộ với src/specs/001-user-auth/ (API DELETE /api/v1/listings/:id đã có sẵn; tái sử dụng middleware requireAuth, requireRole('landlord'), requireOwnership) và src/specs/002-search-filtering/ (bắt buộc dùng đúng 4 mã room_types: private_room, shared_room, studio, apartment). Tin mới tạo luôn có trạng thái 'pending'. Khi chủ trọ sửa tin, trạng thái tự động reset về 'pending' và xóa reject_reason cũ. Chủ trọ chỉ xem được tin của chính mình (gồm pending, approved, rejected), có lọc theo trạng thái và xem được lý do từ chối. Dùng luôn schema database hiện tại trong backend/migrations/1700000000000_init.js và 1700000004000_search_room_types.js (không thêm cột mới). Ảnh phòng trọ gửi lên dưới dạng mảng URL hợp lệ (từ 1 đến 10 ảnh)."

**Scope**: This feature delivers an end-to-end listing lifecycle management solution tailored exclusively for landlords on the Roomify platform. It encompasses creating new boarding house listings with verified geographic coordinates from an interactive map picker, managing and browsing the landlord's own listings portfolio across all moderation stages (`pending`, `approved`, `rejected`), modifying existing listings with automatic moderation reset, and permanently removing listings. All capabilities adhere strictly to the established PostgreSQL database schema, existing authentication/authorization guards, and the four unified room types.

---

## User Scenarios & Testing *(mandatory)*

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

The user journeys detailed below reflect the core workflows of landlords managing rental accommodations. Each scenario is independently testable using pre-authenticated landlord accounts.

---

### User Story 1 - Create and Submit a New Boarding House Listing (Priority: P1)

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

As an authenticated landlord, I want to create a new boarding house listing by providing property details, pricing, room classification, amenities, image URLs, and geographic coordinates, so that I can submit it for administrator moderation and subsequent public visibility.

**Why this priority**: Listing creation (UC-13) is the fundamental prerequisite for landlords to supply rental properties to the Roomify marketplace. Without this capability, the platform has no inventory to search or display.

**Independent Test**: Using an authenticated landlord session, submit a complete and valid listing payload. Verify that exactly one listing record is persisted with status `pending`, associated with the logged-in landlord (`ownerId`), correctly links provided amenity IDs and image URLs, and does not appear in public search results until approved.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord on the listing creation form, **When** they fill in all required fields (title, description, price, area, room type, district, address, map coordinates), supply between 1 and 10 valid image URLs, select applicable amenities, and submit, **Then** the system saves the listing with status `pending`, sets `rejectReason` to `null`, associates it with the landlord's user ID, stores all image URLs (designating the first image as cover), and displays a submission confirmation with a redirect to the "My Listings" management dashboard.
2. **Given** a listing submission, **When** the payload is processed, **Then** the room type must resolve to one of the four valid database room types (`private_room`, `shared_room`, `studio`, `apartment`); any invalid room type identifier is rejected with an informative validation error.
3. **Given** a submission missing one or more mandatory fields (e.g., empty title, missing coordinates, or non-positive price/area), **When** submitted, **Then** the system rejects the creation request, highlights the faulty fields, and creates no database records.
4. **Given** a submission with no images or more than 10 image URLs, **When** submitted, **Then** the system rejects the request with an explicit error specifying that between 1 and 10 photo URLs are required.
5. **Given** an unauthenticated visitor or an authenticated tenant, **When** they attempt to submit a new listing, **Then** the request is rejected with an HTTP 401 Unauthorized or 403 Forbidden error respectively.

---

### User Story 2 - Pinpoint and Select Exact Location on Interactive Map (Priority: P1)

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

As an authenticated landlord drafting or editing a listing, I want to search for an address or interactively place and drag a pin on a map, so that I can capture accurate geographic coordinates (latitude and longitude) and standardized address information for my property.

**Why this priority**: Accurate geographic location (UC-14) is mandatory for listing discovery, spatial indexing (PostGIS `geom`), map visualization, and proximity calculations to schools and amenities.

**Independent Test**: Open the location picker modal, search an address or drag the pin to a known landmark in Ho Chi Minh City, and verify that the captured latitude, longitude (with at least 6 decimal places of precision), and formatted street address are populated into the listing form.

**Acceptance Scenarios**:

1. **Given** a landlord in the listing form, **When** they open the map picker, enter an address query, and pick a suggested place, **Then** the map centers on the selected location, places a marker, and updates the coordinates panel with the exact latitude, longitude, and formatted address.
2. **Given** the map marker placed on the map, **When** the landlord drags and drops the marker pin to refine the entrance position, **Then** reverse geocoding updates the latitude, longitude, and street address.
3. **Given** confirmed coordinates on the map picker, **When** the landlord clicks "Confirm Location", **Then** the modal closes and the listing form's address, district, latitude, and longitude fields are populated with the confirmed values.
4. **Given** a landlord attempting to submit a listing without confirming map coordinates, **When** form validation executes, **Then** submission is halted with a validation message requiring map location selection.

---

### User Story 3 - View, Filter, and Monitor Landlord's Own Listings (Priority: P1)

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

As an authenticated landlord, I want to view a comprehensive list of all boarding house listings I have submitted, filter them by moderation status, and inspect admin rejection reasons, so that I can monitor the publication state of my properties and take corrective actions.

**Why this priority**: Landlords need transparency into their listing portfolio (UC-15). Viewing moderation status (`pending`, `approved`, `rejected`) and reading rejection feedback is essential for maintaining listings on Roomify.

**Independent Test**: Prepare a test landlord account possessing listings in each of the three statuses (`pending`, `approved`, `rejected`), along with listings owned by other landlords. Query the management view and verify that only the actor's own listings are returned, status filter tabs function accurately, summary counters tally correctly, and rejection reasons are fully legible for rejected listings.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord accessing the "My Listings" page (`GET /api/v1/listings/mine`), **When** the list loads, **Then** the system displays all listings owned by that landlord, ordered by creation/update timestamp from newest to oldest, with total counters for All, Approved, Pending, and Rejected listings.
2. **Given** listings owned by Landlord A and Landlord B, **When** Landlord A queries "My Listings", **Then** the response contains only Landlord A's listings; Landlord B's listings are strictly excluded regardless of status.
3. **Given** a landlord selecting a status filter (e.g., "Pending" or "Rejected"), **When** the filter is applied, **Then** only owned listings matching that exact status are displayed.
4. **Given** a listing with status `rejected`, **When** viewed on the dashboard, **Then** the card/row explicitly displays the administrator's recorded `rejectReason` to inform the landlord why it was declined.
5. **Given** a landlord who has not posted any listings, **When** they view the page, **Then** an informative empty state is shown with a clear action button directing them to "Post New Listing".
6. **Given** active search or filter criteria matching none of the landlord's listings, **When** applied, **Then** the system displays a "No matching listings found" message with a button to reset active filters.

---

### User Story 4 - Edit Existing Listing and Trigger Moderation Reset (Priority: P2)

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

As an authenticated landlord, I want to edit the details, pricing, amenities, room type, photos, or location of an existing listing that I own, so that my listing stays up to date while ensuring any modified content undergoes administrative re-moderation.

**Why this priority**: Accommodating rent adjustments, amenity updates, and revising rejected listings based on admin feedback (UC-16) is a recurring landlord task. Re-moderation prevents unverified content changes from bypassing platform rules.

**Independent Test**: Update an `approved` listing and separately a `rejected` listing owned by the test landlord. Verify that upon saving valid changes (`PATCH /api/v1/listings/:id`), the listing's fields are updated, the status is automatically reset to `pending`, any existing `rejectReason` is cleared (`null`), and the listing is immediately hidden from public search until re-approved. Verify that a landlord cannot edit another user's listing.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord editing an existing listing they own, **When** they open the edit form (`GET /api/v1/listings/mine/:id`), **Then** all current listing data (title, description, price, area, room type, district, address, coordinates, amenities, image URLs) is pre-populated, accompanied by a notice warning that saving modifications resets status to `pending`.
2. **Given** an `approved` or `rejected` listing, **When** the landlord submits valid changes via `PATCH /api/v1/listings/:id`, **Then** the listing record is updated in the database, its `status` is automatically set to `pending`, its `rejectReason` is set to `null`, and its public search availability is suspended.
3. **Given** a landlord opening the edit form and clicking "Save" without changing any fields or photos, **When** submitted, **Then** the system detects no changes were made and preserves the existing status and rejection reason without resetting to `pending`.
4. **Given** a landlord attempting to edit a listing owned by a different landlord, **When** the update request is received, **Then** the system rejects the operation with an HTTP 403 Forbidden error and makes no changes.
5. **Given** a landlord editing a listing and clearing required fields or providing non-positive numbers or zero image URLs, **When** submitted, **Then** validation fails with explicit field error messages and database state is unchanged.

---

### User Story 5 - Permanently Delete an Owned Listing (Priority: P2)

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

As an authenticated landlord, I want to permanently delete a listing that I own, so that outdated or unavailable listings are cleanly removed from my dashboard and from the platform.

**Why this priority**: Listing deletion (UC-17) allows landlords to manage off-market properties and ensures data cleanup across search results, tenant favorites, and map markers.

**Independent Test**: Initiate deletion of an owned listing with attached images, amenities, and tenant favorites. Confirm the warning modal, verify that the existing `DELETE /api/v1/listings/:id` endpoint succeeds, cascading deletes to child tables, and verify the listing is no longer returned in "My Listings" or public queries.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord viewing "My Listings", **When** they click "Delete" on a listing they own, **Then** a confirmation modal is displayed showing the listing title and stating that this deletion is irreversible.
2. **Given** the confirmation modal, **When** the landlord confirms deletion, **Then** the system executes the deletion, cascades removal across listing images, amenity associations, favorites, and nearby places, removes the listing from the interface, and displays a success notification.
3. **Given** the confirmation modal, **When** the landlord clicks "Cancel" or closes the modal, **Then** no deletion occurs and the listing remains untouched.
4. **Given** a landlord attempting to delete a listing belonging to another user, **When** the request reaches the server, **Then** the operation is rejected with HTTP 403 Forbidden (`requireOwnership` policy enforcement).
5. **Given** a deletion request for a non-existent listing ID, **When** processed, **Then** the server responds with HTTP 404 Not Found.

---

### Edge Cases

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

- **Image URL Array Validation**: An image URL array submitted with fewer than 1 URL or more than 10 URLs is rejected. Individual URLs must be valid, well-formed HTTP/HTTPS strings; empty or whitespace-only strings are rejected.
- **Floating-point Coordinate Extremes**: Latitude outside $[-90, 90]$ or longitude outside $[-180, 180]$ is rejected by both application validation and database check constraints (`listings_lat_check`, `listings_lng_check`).
- **PostGIS Point Synchronization**: The PostGIS `geom` column (`geography(Point,4326)`) must be constructed from `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`. When `lat` or `lng` is modified during update, `geom` must be updated atomically to ensure spatial queries remain accurate.
- **Room Type Integrity**: When assigning `roomTypeId`, the system accepts only IDs corresponding to active room types with codes `private_room`, `shared_room`, `studio`, or `apartment`. A non-existent or inactive room type ID triggers a validation error.
- **Non-destructive Idempotent Updates**: If a landlord submits an update request with identical values to the stored record, the system detects zero changes and avoids triggering an unintended moderation reset to `pending`.
- **Concurrent Moderation vs Edit**: If an admin reviews and approves/rejects a listing at the same moment a landlord submits an edit, the landlord's committed transaction takes precedence in resetting the status to `pending`, ensuring unvetted content is never left in `approved` status.
- **Account State Invalidation**: If an active landlord is disabled (`is_active = false`) by an admin while navigating the listing creation/editing workflow, subsequent API requests are rejected by `requireAuth` with HTTP 403 `INACTIVE_ACCOUNT`.
- **String Sanitization and Trimming**: String inputs (`title`, `description`, `address`, `district`) must have leading and trailing whitespace trimmed. Title length must not exceed 150 characters, address must not exceed 255 characters, and district must not exceed 100 characters.

---

## Requirements *(mandatory)*

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

### Functional Requirements

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

#### Authentication, Role & Ownership Enforcement
- **FR-001**: The system MUST restrict all listing management endpoints (`POST /api/v1/listings`, `GET /api/v1/listings/mine`, `GET /api/v1/listings/mine/:id`, `PATCH /api/v1/listings/:id`, `DELETE /api/v1/listings/:id`) to authenticated users with the active `landlord` role using existing middleware `requireAuth` and `requireRole('landlord')`.
- **FR-002**: The system MUST verify that the authenticated landlord owns the target listing for all read-detail (`GET /mine/:id`), update (`PATCH /:id`), and delete (`DELETE /:id`) operations using the existing `requireOwnership` guard; requests targeting listings owned by other users MUST be rejected with HTTP 403 Forbidden.
- **FR-003**: Inactive accounts (`is_active = false`) or accounts whose role was changed from `landlord` to `tenant` MUST have listing management operations immediately rejected with HTTP 403.

#### Listing Creation (UC-13 & UC-14)
- **FR-004**: The system MUST allow an authenticated landlord to create a new boarding house listing with the following required data fields: `title` (max 150 chars), `description` (text), `price` (integer in VND, > 0), `areaM2` (real, > 0), `address` (max 255 chars), `district` (max 100 chars), `lat` (double precision, $[-90, 90]$), `lng` (double precision, $[-180, 180]$), `roomTypeId` (foreign key to `room_types`), optional amenity IDs (`amenityIds`), and an array of 1 to 10 valid image URLs (`imageUrls`).
- **FR-005**: Every newly created listing MUST be initialized with status `pending`. The system MUST NOT permit any client or landlord payload to override or specify a status other than `pending`.
- **FR-006**: When creating a listing, the system MUST compute and store the PostGIS geometry point `geom` using `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` with longitude preceding latitude.
- **FR-007**: The system MUST populate the `listing_images` table with each provided photo URL, setting `is_cover = true` for the first image (index 0) and `is_cover = false` for subsequent images, while preserving sequential `sort_order`.
- **FR-008**: The system MUST validate `roomTypeId` against the existing `room_types` database table and reject any code other than `private_room`, `shared_room`, `studio`, or `apartment`.
- **FR-009**: The listing creation process MUST execute within an atomic database transaction. If saving photos, amenities, or coordinates fails, the entire transaction MUST be rolled back, leaving no orphaned rows.

#### Location & Map Selection (UC-14)
- **FR-010**: The map picker component MUST allow landlords to search for addresses, retrieve auto-complete suggestions, and place/drag a marker pin on an interactive map.
- **FR-011**: Dragging or placing the pin MUST extract coordinates with a minimum precision of 6 decimal places and trigger reverse geocoding to update the street address and district.
- **FR-012**: Confirming location on the map picker MUST transfer the resolved `address`, `district`, `lat`, and `lng` back to the active listing form.

#### Landlord Listings Management & Dashboard (UC-15)
- **FR-013**: The system MUST provide an endpoint (`GET /api/v1/listings/mine`) returning all listings where `owner_id` equals the authenticated landlord's ID, ordered by `created_at DESC` (and tie-broken by `id DESC`).
- **FR-014**: The "My Listings" endpoint MUST return listings across all moderation statuses (`pending`, `approved`, `rejected`), including their current `status`, `rejectReason`, `roomType` name/code, cover image URL, full `images` array, `amenities` list, pricing, area, and timestamp.
- **FR-015**: The system MUST support status filtering on "My Listings" via an optional query parameter `status` (`all`, `pending`, `approved`, `rejected`), returning only owned listings matching the requested status.
- **FR-016**: For any listing with status `rejected`, the system MUST return the non-empty `rejectReason` recorded during admin moderation so the landlord can inspect the rejection cause.
- **FR-017**: The system MUST provide summary counts for Total, Pending, Approved, and Rejected listings belonging to the landlord to support UI status badge counters via the response envelope `{ success: true, data: { listings: [...], summary: { ... } } }`.
- **FR-018**: The system MUST prevent any landlord from retrieving, viewing, or inferring listings belonging to any other user through the "My Listings" endpoint.
- **FR-018b**: The system MUST provide an endpoint (`GET /api/v1/listings/mine/:id`) allowing the owning landlord to retrieve full listing data for editing regardless of whether the listing is `pending`, `approved`, or `rejected`.

#### Listing Modification & Moderation Reset (UC-16)
- **FR-019**: The system MUST allow a landlord to edit an existing owned listing via `PATCH /api/v1/listings/:id` for fields `title`, `description`, `price`, `areaM2`, `address`, `district`, `lat`, `lng`, `roomTypeId`, `amenityIds`, and `imageUrls`.
- **FR-020**: When a landlord updates any field of an existing listing (whether previously `approved`, `rejected`, or `pending`), the system MUST automatically reset the listing's `status` to `pending` and reset `rejectReason` to `null`.
- **FR-021**: An updated listing that was previously `approved` MUST be immediately removed from public search results and map discovery until re-approved by an administrator.
- **FR-022**: If the landlord submits an update without modifying any data fields or photos, the system MUST preserve the current status and reject reason without resetting to `pending`.
- **FR-023**: When updating image URLs, the system MUST replace the previous `listing_images` records with the newly submitted array (between 1 and 10 URLs), re-assigning cover and sort orders within the atomic update transaction.

#### Listing Deletion (UC-17)
- **FR-024**: The system MUST support permanently deleting an owned listing via the existing endpoint `DELETE /api/v1/listings/:id` guarded by `requireAuth`, `requireRole('landlord')`, and `requireOwnership`.
- **FR-025**: Listing deletion MUST atomically remove the listing row from `listings`, which automatically cascades deletion to `listing_images`, `listing_amenities`, `nearby_places`, and `favorites` via existing foreign key `ON DELETE CASCADE` constraints.
- **FR-026**: A deleted listing MUST be immediately inaccessible from "My Listings", public search, map views, and tenant favorites.

---

### Key Entities

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

- **Listing (`listings`)**: The central entity representing a rental boarding house. Key attributes:
  - `id`: Unique bigserial primary key (represented as a canonical string in API layers).
  - `ownerId` (`owner_id` in DB): Foreign key referencing the landlord user in `users(id)`.
  - `title`: Short descriptive title (varchar(150), required).
  - `description`: Detailed prose description of room amenities and policies (text).
  - `price`: Monthly rent in VND (integer, required, > 0).
  - `areaM2` (`area_m2` in DB): Usable floor area in square meters (real, required, > 0).
  - `address`: Street number and street name (varchar(255), required).
  - `district`: Urban/suburban administrative district name (varchar(100), required).
  - `lat`, `lng`: Geographic coordinates in WGS 84 (double precision, required, lat in $[-90, 90]$, lng in $[-180, 180]$).
  - `geom`: PostGIS geography point (Point, 4326), synchronized with `(lng, lat)`.
  - `roomTypeId` (`room_type_id` in DB): Foreign key referencing `room_types(id)`.
  - `status`: Moderation state (`pending`, `approved`, `rejected`), defaults to `pending`.
  - `rejectReason` (`reject_reason` in DB): Feedback notes from an administrator when a listing is rejected (varchar(500), nullable).
  - `createdAt` (`created_at` in DB): Creation timestamp (timestamptz).
- **Room Type (`room_types`)**: The standardized room classification catalog. Restricted strictly to:
  - `private_room` (Phòng trọ riêng)
  - `shared_room` (Phòng ở ghép)
  - `studio` (Studio / căn hộ mini)
  - `apartment` (Căn hộ chung cư)
- **Listing Image (`listing_images`)**: Media representations of the room.
  - `listingId` (`listing_id` in DB): FK to `listings(id)`.
  - `url`: Public HTTP/HTTPS URL string of the photo.
  - `isCover` (`is_cover` in DB): Boolean flag indicating whether the image is the primary thumbnail.
  - `sortOrder` (`sort_order` in DB): Display sequence integer (0-indexed).
- **Amenity Association (`listing_amenities`)**: Many-to-many junction table between `listings` and `amenities`.
  - `listingId` (`listing_id` in DB): FK to `listings(id)`.
  - `amenityId` (`amenity_id` in DB): FK to `amenities(id)`.

---

## Success Criteria *(mandatory)*

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

### Measurable Outcomes

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

- **SC-001**: 100% of newly created listings start in `pending` status with `rejectReason = null` and are immediately excluded from public search and map endpoints.
- **SC-002**: 100% of listing modifications (on approved, rejected, or pending listings) reset the listing's moderation status to `pending`, clear any previous `rejectReason`, and suspend public search visibility.
- **SC-003**: 0% information leakage: Across all automated security and ownership tests, no landlord can access, view, edit, or delete another landlord's listing via `GET /mine`, `GET /mine/:id`, `PATCH /:id`, or `DELETE /:id` endpoints (100% HTTP 403 Forbidden enforcement).
- **SC-004**: Landlords can complete the entire listing creation flow (including title, details, amenities, uploading/supplying photo URLs, and interactive map location selection) in under 3 minutes during usability verification.
- **SC-005**: In a test suite containing 500 landlord listings, the "My Listings" query with status filtering responds with complete data and summary counts in under 500 milliseconds.
- **SC-006**: Deleting an owned listing permanently cleans up 100% of associated records across `listing_images`, `listing_amenities`, and `favorites` with zero dangling foreign keys or orphaned rows.

---

## Assumptions

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

- **Database Schema Invariance**: No new columns or schema migrations are introduced. All functionality utilizes the established tables (`listings`, `listing_images`, `amenities`, `listing_amenities`, `room_types`, `users`, `favorites`, `nearby_places`) from migrations `1700000000000_init.js` and `1700000004000_search_room_types.js`.
- **Photo Storage Contract**: Listing photos are passed as an array of valid, accessible HTTP/HTTPS URL strings (`imageUrls`, 1 to 10 photos). Image hosting, binary file uploads, or cloud storage integration provide the public URLs before or during submission.
- **Room Types Standard**: Only the 4 active room types (`private_room`, `shared_room`, `studio`, `apartment`) established in `002-search-filtering` are supported. Whole-house or unclassified types are strictly disallowed for new/edited listings.
- **Moderation Workflow Boundary**: Administrator approval/rejection actions (UC-18, UC-19, UC-20) belong to the Admin Moderation functional group. This specification guarantees that landlord actions (`create`, `edit`) properly feed the moderation pipeline with `pending` status and display `rejectReason` when set.
- **Security & Authorization Reuse**: The authentication framework (`requireAuth`), role check (`requireRole('landlord')`), and ownership check (`requireOwnership`) developed in `001-user-auth` are reused without alteration.
- **Existing Deletion Implementation**: Endpoint `DELETE /api/v1/listings/:id` already implemented in `listingRoutes.js` and `listingService.js` is retained and verified as part of the Comprehensive Listing Management suite.

---

## Confirmed Decisions

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

- **Listing Moderation Reset Rule**: Every edit made by a landlord to an existing listing automatically reverts `status` to `pending` and sets `rejectReason` to `null`. This prevents unauthorized modifications from being visible without administrative review.
- **Strict Ownership Filtering**: The `GET /api/v1/listings/mine` endpoint automatically scopes queries by `owner_id = req.user.id`. A landlord cannot pass an arbitrary owner ID to peek at another user's listings.
- **Editing Endpoint Handoff**: `GET /api/v1/listings/mine/:id` provides full details, photos, and amenities for an owned listing in any status so the frontend can pre-populate the edit form even for pending or rejected listings.
- **Cover Image Convention**: The first image in the submitted array (`imageUrls[0]`) is marked `is_cover = true` (`isCover = true`) with `sort_order = 0`; all subsequent images have `is_cover = false` and incremental `sort_order`.
- **Map Coordinate Precision**: Coordinates must be retained with at least 6 decimal places of precision and saved simultaneously to `lat`, `lng`, and PostGIS `geom` (`ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`).
- **Room Type Codes**: Creation and update requests must accept `roomTypeId`, validated against the 4 pre-seeded database room types.
