# Search API Contract

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa

**Feature**: [spec.md](../spec.md)

**Data model**: [data-model.md](../data-model.md)

All endpoints are public, read-only, and under `/api/v1`. They require no authorization header. JSON errors use the existing `{ "success": false, "error": { "code": "...", "message": "..." } }` envelope. Successful non-paginated responses use `{ "success": true, "data": ... }`.

## `GET /listings/filters`

Returns the filter choices available for public approved listings.

### Success: `200`

```json
{
  "success": true,
  "data": {
    "districts": ["Bình Thạnh", "Thủ Đức"],
    "roomTypes": [
      { "code": "team-agreed-code", "name": "Team-agreed label" }
    ],
    "amenities": [
      { "id": "1", "name": "Wifi" }
    ]
  }
}
```

Districts are distinct values from approved listings, sorted by display name. Room types are active catalog entries. Amenities are supported amenity entries used by approved listings. The example room-type value is illustrative only and must not be seeded as a real category.

## `GET /listings`

Returns one page of approved listing summaries. Repeated `amenityIds` parameters are supported.

### Query parameters

| Name | Type | Required | Rules |
|---|---|---:|---|
| `keyword` | string | No | Trim and normalize repeated spaces; match title, address, or district. |
| `district` | string | No | Must match a supported district value. |
| `roomType` | string | No | Must match an active room-type catalog code. |
| `maxPrice` | positive integer | No | Inclusive VND/month maximum. |
| `minAreaM2` | positive number | No | Inclusive lower area bound. |
| `maxAreaM2` | positive number | No | Inclusive upper area bound. |
| `amenityIds` | repeated positive integer | No | Every selected amenity must match; duplicate IDs are normalized to unique IDs. |
| `page` | positive integer | No | Defaults to `1`; fixed page size is `12`. |

Unknown query parameters, malformed values, unsupported filter values, and `minAreaM2 > maxAreaM2` return `400 VALIDATION_ERROR`. Criteria are never silently dropped.

### Success: `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "title": "Room near campus",
      "price": 4500000,
      "areaM2": 24,
      "address": "Example street",
      "district": "Bình Thạnh",
      "roomType": { "code": "team-agreed-code", "name": "Team-agreed label" },
      "coverImageUrl": null,
      "amenities": [{ "id": "1", "name": "Wifi" }],
      "createdAt": "2026-11-12T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 12, "total": 1 }
}
```

The example values are illustrative. Return only explicitly selected public fields, with no owner or account details. Results are ordered by `created_at DESC, id DESC`. An empty match is `200` with an empty `data` array and `pagination.total` equal to zero.

## `GET /listings/{id}`

Returns a public detail projection only when the listing exists and is administrator-approved. The response includes the public summary fields plus description, ordered public images, and amenity names/IDs. It excludes owner/account details, moderation metadata, and private contact data.

- `200`: `{ "success": true, "data": { ... } }`
- `400 VALIDATION_ERROR`: malformed identifier.
- `404 NOT_FOUND`: missing or non-approved listing; pending and rejected records are indistinguishable from missing records.

## Query and Result Semantics

- All search categories combine with AND semantics; keyword text can match any of title, address, or district.
- Keyword matching is case-insensitive substring matching; wildcard characters in user input are treated literally.
- Multiple selected amenities use all-required semantics.
- Price and area bounds are inclusive.
- Search results and detail reads always apply the approved-status predicate on the server.
- SQL values are parameterized; sort expressions and selected columns are fixed by the server.
- The API returns the existing standard error envelope for validation, not-found, and server failures. Server failures are not converted into successful empty results.
