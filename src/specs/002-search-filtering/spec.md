# Feature Specification: Search and Filtering

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

**Feature Branch**: Not assigned  
**Created**: 2026-11-11  
**Status**: Draft  
**Input**: User description: "Search and Filtering – Tìm kiếm và lọc phòng"

This feature helps visitors and tenants find rental rooms matching their needs by searching listing information and combining location, room type, maximum price, area, and required amenity filters. It covers the search results experience; interactive map browsing is a separate feature.

## User Scenarios & Testing *(mandatory)*

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

### User Story 1 - Search by Keyword and Location (Priority: P1)

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

As a visitor or tenant looking for a room, I want to search using words and a location so that I can find relevant approved listings.

**Why this priority**: Finding candidate rooms is the primary purpose of this feature and provides value before advanced filters are applied.

**Independent Test**: Prepare approved listings with different titles, addresses, and districts, plus pending and rejected listings. Search for known terms and locations and verify that matching approved listings appear while nonmatching and non-approved listings do not.

**Acceptance Scenarios**:

1. **Given** approved listings with different titles, addresses, and districts, **When** a visitor searches for a word appearing in a listing's title, street/address, or district, **Then** the results include matching listings and exclude listings with no match.
2. **Given** listings in multiple districts, **When** a visitor selects a district, **Then** every result belongs to that district.
3. **Given** a visitor enters a keyword with leading, trailing, or repeated spaces, **When** the search is submitted, **Then** insignificant surrounding or repeated spaces do not prevent an otherwise valid match.
4. **Given** a visitor searches without entering a keyword or selecting filters, **When** the search is submitted, **Then** the system displays approved listings in the default result order.

### User Story 2 - Combine Room Filters (Priority: P1)

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

As a visitor or tenant, I want to combine room type, maximum price, room area, location, and amenity filters so that I can narrow the results to rooms that meet my requirements.

**Why this priority**: Room seekers commonly need to compare affordability, room size, and essential amenities together.

**Independent Test**: Prepare approved listings that vary by room type, price, area, district, and amenity combinations. Apply one filter at a time and multiple filters together, then verify every result satisfies the selected criteria.

**Acceptance Scenarios**:

1. **Given** listings with different monthly prices, **When** a visitor specifies a maximum price, **Then** results include only listings whose price is less than or equal to that maximum.
2. **Given** listings with different room types, **When** a visitor selects a room type, **Then** results include only listings of that type.
3. **Given** listings with different areas, **When** a visitor specifies a minimum area, maximum area, or both, **Then** results include only listings within the selected inclusive area bounds.
4. **Given** listings with different amenities, **When** a visitor selects one or more required amenities, **Then** every result includes all selected amenities.
5. **Given** valid criteria from multiple filter categories, **When** a visitor applies the filters, **Then** results satisfy every selected category as well as the keyword, if provided.
6. **Given** a minimum area above the maximum area, **When** a visitor applies the filters, **Then** the system identifies the invalid range and does not present results as though the invalid criteria were applied successfully.

### User Story 3 - Understand and Recover from Empty or Failed Searches (Priority: P1)

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

As a visitor or tenant, I want clear feedback when a search has no results or cannot be completed so that I can adjust my criteria or try again.

**Why this priority**: Clear empty and error states prevent users from mistaking a failed search for a valid result.

**Independent Test**: Search for criteria with no matching approved listing, clear the criteria, and separately simulate an unavailable search service. Verify the empty and failure messages are distinct and that retry is possible.

**Acceptance Scenarios**:

1. **Given** valid criteria that match no approved listing, **When** the search completes, **Then** the system explains that no rooms were found and offers a way to revise or clear the criteria.
2. **Given** a search service failure, **When** a visitor submits a search, **Then** the system reports that results could not be loaded, does not show stale results as current, and allows retry without losing the entered criteria.
3. **Given** one or more active criteria, **When** the visitor chooses to clear them, **Then** all keyword and filter values return to their defaults and the unfiltered approved results are shown.

### User Story 4 - Browse Matching Results (Priority: P2)

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

As a visitor or tenant, I want to browse result pages and understand the key facts about each room so that I can decide which listing to inspect.

**Why this priority**: Result browsing supports larger result sets and makes search output useful without making map browsing part of this feature.

**Independent Test**: Prepare enough approved matching listings to span multiple result pages. Verify that result summaries are understandable and moving between pages preserves the search criteria and does not repeat or omit matching records.

**Acceptance Scenarios**:

1. **Given** more matching listings than fit on one 12-item result page, **When** a visitor moves to another page, **Then** the next matching results are shown and the active search criteria remain in effect.
2. **Given** an approved listing in the results, **When** a visitor views its result card, **Then** the card shows its title, monthly price, room type, area, district, and available cover image.
3. **Given** a result card for an approved listing, **When** a visitor opens that result, **Then** the visitor can continue to the listing's details.
4. **Given** a result card or listing detail opened from search, **When** a visitor views the public information, **Then** the system does not expose private account or landlord data that is not part of the public listing.
5. **Given** a search is loading, **When** the visitor waits for the response, **Then** the interface communicates the loading state and prevents the visitor from mistaking it for an empty result.

### Edge Cases

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

- A keyword contains only spaces or punctuation and matches no searchable text.
- No maximum price is supplied; price does not restrict the results.
- A minimum or maximum area is omitted; the remaining area bound still applies.
- A room's price or area equals the selected maximum or minimum; the boundary listing remains eligible.
- A filter contains a value not offered by the current district, room-type, or amenity choices; the value is rejected or safely produces no match, never a broader result.
- A listing is pending or rejected; it never appears in search results, regardless of matching criteria.
- There are no approved listings, even when no filters are selected.
- A search request fails after the visitor changes criteria; the current criteria remain available for retry, and results from an earlier request are not presented as the new search.
- The visitor moves between result pages after changing a filter; results from the earlier criteria are not mixed with the new result set.

## Requirements *(mandatory)*

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

### Functional Requirements

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

- **FR-001**: The system MUST allow visitors and signed-in tenants to search administrator-approved rental listings without requiring authentication.
- **FR-002**: The system MUST allow a user to search listing titles, street/address text, and district names using a text keyword.
- **FR-003**: The system MUST allow a user to filter results by district, room type, maximum monthly price, minimum and maximum room area, and one or more required amenities.
- **FR-004**: The system MUST treat the maximum monthly price and the minimum and maximum area bounds as inclusive. When both area bounds are supplied, the minimum MUST NOT exceed the maximum.
- **FR-005**: When multiple filter categories are selected, the system MUST return only listings satisfying every selected category and the keyword, if provided. When multiple amenities are selected, every result MUST contain all selected amenities.
- **FR-006**: The system MUST include only listings approved by an administrator in search results. Pending and rejected listings MUST NOT be returned.
- **FR-007**: The system MUST display matching results as listing summaries containing enough information to distinguish options, including the listing title, monthly price, room type, area, district, and available cover image.
- **FR-008**: The system MUST display 12 listings per result page, order results by listing creation time from newest to oldest and then by listing identifier from highest to lowest, and preserve the active keyword and filters when visitors change pages.
- **FR-009**: The system MUST provide an action to clear the keyword and all active filters and then display unfiltered administrator-approved listings.
- **FR-010**: The system MUST distinguish a successful search with no matches from a search failure. An empty result MUST offer a way to adjust or clear criteria; a failure MUST offer retry and MUST NOT be displayed as a successful empty search.
- **FR-011**: The system MUST identify an invalid area range, unsupported filter values, and malformed search input and MUST NOT silently broaden a search when criteria are invalid.
- **FR-012**: The search interface MUST provide understandable loading, results, empty, validation-error, and service-error states.
- **FR-013**: The search interface MUST support keyboard operation and remain usable at the application's supported narrow and wide viewport sizes.
- **FR-014**: Search results MUST NOT expose private landlord or account information that is not part of a public listing summary.

### Key Entities

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

- **Listing**: A rental room available for discovery, with descriptive information such as title, description, monthly price, room type, area, address, district, images, and moderation state.
- **Amenity**: A named facility or service associated with a listing, such as Wi-Fi, parking, or air conditioning.
- **Search criteria**: The optional keyword, district, room type, maximum price, area bounds, and required amenities selected for a search.
- **Search result**: The approved listings matching the active criteria, presented in a browsable result set.

## Success Criteria *(mandatory)*

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

### Measurable Outcomes

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

- **SC-001**: All defined search and filter acceptance scenarios return the exact expected approved listing set in the prepared test fixtures.
- **SC-002**: No pending or rejected listing appears in any tested search result, including unfiltered searches.
- **SC-003**: With 1,000 prepared approved listings, at least 95% of valid searches display their first result page within 3 seconds in the documented team verification environment.
- **SC-004**: At least 9 out of 10 participants in a usability check can locate a listing matching supplied location, room type, maximum budget, area, and amenity needs within two minutes without assistance.
- **SC-005**: Every tested invalid range, empty result, and service failure is distinguishable to the user, and all failed searches preserve enough entered criteria to retry or revise.
- **SC-006**: All search controls and result navigation can be completed using a keyboard at viewport widths of 320 CSS pixels and 1280 CSS pixels without horizontal page scrolling.

## Assumptions

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

- The feature is the list/search experience for public room listings. Interactive map browsing, location-radius searches, favorites, messaging, AI recommendations, and listing administration belong to other functional groups.
- Search is available to visitors and tenants. Landlord management of private or unpublished listings is not part of public search.
- Search results include listings approved by an administrator. The current listing workflow does not define availability states such as vacant, rented, or hidden; filtering by availability is outside this version.
- Searchable text comprises listing title, street/address, and district. District, room type, maximum monthly price, room area, and the amenities associated with listings are available as filter criteria.
- When several filter categories are combined, all selected categories must match. When multiple amenities are selected, a result must have every selected amenity.
- The maximum monthly price and room-area bounds are inclusive. Price is entered and displayed in VND per month; area is entered and displayed in square meters.
- The property-type filter uses the set of room types agreed for listing creation; the same values must be available to search as filter choices.
- Results show 12 listings per page, sorted by creation time from newest to oldest and then by listing identifier from highest to lowest.
- Search results use the application's existing listing summary and detail experience. Search does not define a new listing-detail workflow.
- The response-time and usability thresholds in the success criteria are proposed acceptance targets and will be checked against the documented team test data and environment.
- Đặng Hiển and Nguyễn Hữu Nghĩa will agree on the listing data contract and API responsibilities during planning. This specification defines user-visible behavior and does not prescribe a programming language, framework, endpoint, or database design.

## Decisions to Confirm

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

Confirm the remaining items with Đặng Hiển before finalizing the implementation plan. Record the agreed decisions here and update any affected requirements or acceptance scenarios.

- **Room-type choices and listing contract**: The use case requires a property-type filter, but the currently inspected database migration has no room-type field. Confirm the room-type choices with listing creation and ensure storing and exposing the selected type is included in the feature plan.
- **Proposed success targets**: Confirm or revise the 3-second response target, 1,000-listing test dataset, usability-test sample, and viewport widths in the success criteria.
