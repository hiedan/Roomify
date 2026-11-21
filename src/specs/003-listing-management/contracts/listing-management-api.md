# Listing Management API Contract

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Feature**: [spec.md](../spec.md)

**Data model**: [data-model.md](../data-model.md)

**Plan**: [plan.md](../plan.md)

All endpoints below reside under the base path `/api/v1/listings`. They require an authenticated session token via the standard `Authorization: Bearer <token>` header and enforce the active `landlord` account role.

All JSON payloads strictly adhere to `docs/coding-standards.md` using `camelCase` for all request and response attributes, and return standard Roomify response envelopes:
- **Success**: `{ "success": true, "data": <payload> }`
- **Error**: `{ "success": false, "error": { "code": "<ERROR_CODE>", "message": "<Descriptive error text>" } }`

---

## 1. `POST /api/v1/listings`

Creates a new boarding house listing with verified map coordinates, initial `pending` moderation status, room classification, amenities, and photos.

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

### Request

- **Headers**:
  ```http
  Authorization: Bearer <valid_landlord_jwt_token>
  Content-Type: application/json
  ```
- **Body Schema (`application/json`)**:
  ```json
  {
    "title": "Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM",
    "description": "Phòng mới xây, đầy đủ tiện nghi, an ninh 24/7, có ban công thoáng mát.",
    "price": 3500000,
    "areaM2": 25.5,
    "address": "268 Lý Thường Kiệt, Phường 14",
    "district": "Quận 10",
    "lat": 10.772583,
    "lng": 106.657806,
    "roomTypeId": 1,
    "amenityIds": [1, 2, 3, 5],
    "imageUrls": [
      "https://example.com/photos/room-main.jpg",
      "https://example.com/photos/room-bathroom.jpg"
    ]
  }
  ```

| Field | Type | Required | Validation Rules |
|---|---|:---:|---|
| `title` | string | Yes | 5 to 150 characters, trimmed. |
| `description` | string | No | Maximum 2000 characters, trimmed. Nullable. |
| `price` | integer | Yes | Integer > 0 (VND per month). |
| `areaM2` | number | Yes | Float > 0 (square meters). |
| `address` | string | Yes | 5 to 255 characters, trimmed. |
| `district` | string | Yes | 2 to 100 characters, trimmed. |
| `lat` | number | Yes | Float between -90.0 and 90.0 (WGS 84). |
| `lng` | number | Yes | Float between -180.0 and 180.0 (WGS 84). |
| `roomTypeId` | integer | Yes | Positive integer referencing an active `room_types(id)`. |
| `amenityIds` | array[int] | No | Array of existing `amenities(id)` integers. Defaults to `[]`. |
| `imageUrls` | array[string]| Yes | Array of 1 to 10 valid HTTP/HTTPS URL strings. First image set as cover. |

### Responses

#### Success: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "101",
    "ownerId": "5",
    "title": "Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM",
    "description": "Phòng mới xây, đầy đủ tiện nghi, an ninh 24/7, có ban công thoáng mát.",
    "price": 3500000,
    "areaM2": 25.5,
    "address": "268 Lý Thường Kiệt, Phường 14",
    "district": "Quận 10",
    "lat": 10.772583,
    "lng": 106.657806,
    "roomType": {
      "id": 1,
      "code": "private_room",
      "name": "Phòng trọ riêng"
    },
    "status": "pending",
    "rejectReason": null,
    "coverImageUrl": "https://example.com/photos/room-main.jpg",
    "amenities": [
      { "id": 1, "name": "Máy lạnh", "icon": "ac" },
      { "id": 2, "name": "Wifi", "icon": "wifi" },
      { "id": 3, "name": "Chỗ để xe", "icon": "parking" },
      { "id": 5, "name": "Nhà vệ sinh riêng", "icon": "toilet" }
    ],
    "images": [
      {
        "id": "201",
        "url": "https://example.com/photos/room-main.jpg",
        "isCover": true,
        "sortOrder": 0
      },
      {
        "id": "202",
        "url": "https://example.com/photos/room-bathroom.jpg",
        "isCover": false,
        "sortOrder": 1
      }
    ],
    "createdAt": "2026-11-20T08:30:00.000Z"
  }
}
```

#### Error: `400 Bad Request`
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "At least 1 photo is required"
  }
}
```

#### Error: `401 Unauthorized`
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "A Bearer session token is required"
  }
}
```

#### Error: `403 Forbidden`
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Account role is not permitted"
  }
}
```

---

## 2. `GET /api/v1/listings/mine`

Retrieves the list of boarding house listings owned exclusively by the authenticated landlord, ordered by creation date descending, with moderation status filtering and summary statistics. Conforms strictly to `sendSuccess(res, data)`.

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

*Route Order Note: Registered in Express routes BEFORE `GET /:id` to prevent route collision.*

### Request

- **Headers**:
  ```http
  Authorization: Bearer <valid_landlord_jwt_token>
  ```
- **Query Parameters**:
  | Name | Type | Required | Values / Description |
  |---|---|:---:|---|
  | `status` | string | No | Filter by moderation status. Allowed: `'all'`, `'pending'`, `'approved'`, `'rejected'`. Defaults to `'all'`. |

### Responses

#### Success: `200 OK`
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "101",
        "ownerId": "5",
        "title": "Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM",
        "description": "Phòng mới xây, đầy đủ tiện nghi, an ninh 24/7, có ban công thoáng mát.",
        "price": 3500000,
        "areaM2": 25.5,
        "address": "268 Lý Thường Kiệt, Phường 14",
        "district": "Quận 10",
        "lat": 10.772583,
        "lng": 106.657806,
        "status": "pending",
        "rejectReason": null,
        "roomType": {
          "id": 1,
          "code": "private_room",
          "name": "Phòng trọ riêng"
        },
        "coverImageUrl": "https://example.com/photos/room-main.jpg",
        "amenities": [
          { "id": 1, "name": "Máy lạnh", "icon": "ac" },
          { "id": 2, "name": "Wifi", "icon": "wifi" },
          { "id": 3, "name": "Chỗ để xe", "icon": "parking" },
          { "id": 5, "name": "Nhà vệ sinh riêng", "icon": "toilet" }
        ],
        "images": [
          {
            "id": "201",
            "url": "https://example.com/photos/room-main.jpg",
            "isCover": true,
            "sortOrder": 0
          },
          {
            "id": "202",
            "url": "https://example.com/photos/room-bathroom.jpg",
            "isCover": false,
            "sortOrder": 1
          }
        ],
        "createdAt": "2026-11-20T08:30:00.000Z"
      },
      {
        "id": "95",
        "ownerId": "5",
        "title": "Studio mini đầy đủ nội thất Bình Thạnh",
        "description": "Studio tầng 3, ban công rộng, không chung chủ.",
        "price": 5000000,
        "areaM2": 32.0,
        "address": "45/2 Điện Biên Phủ, Phường 15",
        "district": "Bình Thạnh",
        "lat": 10.796120,
        "lng": 106.705890,
        "status": "rejected",
        "rejectReason": "Hình ảnh phòng trọ bị mờ và giá thuê không khớp với mô tả đặt cọc.",
        "roomType": {
          "id": 3,
          "code": "studio",
          "name": "Studio / căn hộ mini"
        },
        "coverImageUrl": "https://example.com/photos/studio-thumb.jpg",
        "amenities": [
          { "id": 1, "name": "Máy lạnh", "icon": "ac" },
          { "id": 2, "name": "Wifi", "icon": "wifi" }
        ],
        "images": [
          {
            "id": "180",
            "url": "https://example.com/photos/studio-thumb.jpg",
            "isCover": true,
            "sortOrder": 0
          }
        ],
        "createdAt": "2026-11-18T14:10:00.000Z"
      }
    ],
    "summary": {
      "total": 5,
      "pending": 2,
      "approved": 2,
      "rejected": 1
    }
  }
}
```

---

## 3. `GET /api/v1/listings/mine/:id`

Retrieves a single boarding house listing owned exclusively by the authenticated landlord, including full details, images, amenities, and rejection reason, regardless of whether the listing is `pending`, `approved`, or `rejected`. Used by the frontend to pre-populate `EditListingPage` (UC-16).

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

*Route Order Note: Registered in Express routes BEFORE `GET /:id`.*

### Request

- **Headers**:
  ```http
  Authorization: Bearer <valid_landlord_jwt_token>
  ```
- **Path Parameters**:
  - `id`: Positive integer (BIGINT) identifying the listing.

### Responses

#### Success: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "95",
    "ownerId": "5",
    "title": "Studio mini đầy đủ nội thất Bình Thạnh",
    "description": "Studio tầng 3, ban công rộng, không chung chủ.",
    "price": 5000000,
    "areaM2": 32.0,
    "address": "45/2 Điện Biên Phủ, Phường 15",
    "district": "Bình Thạnh",
    "lat": 10.796120,
    "lng": 106.705890,
    "status": "rejected",
    "rejectReason": "Hình ảnh phòng trọ bị mờ và giá thuê không khớp với mô tả đặt cọc.",
    "roomType": {
      "id": 3,
      "code": "studio",
      "name": "Studio / căn hộ mini"
    },
    "coverImageUrl": "https://example.com/photos/studio-thumb.jpg",
    "amenities": [
      { "id": 1, "name": "Máy lạnh", "icon": "ac" },
      { "id": 2, "name": "Wifi", "icon": "wifi" }
    ],
    "images": [
      {
        "id": "180",
        "url": "https://example.com/photos/studio-thumb.jpg",
        "isCover": true,
        "sortOrder": 0
      }
    ],
    "createdAt": "2026-11-18T14:10:00.000Z"
  }
}
```

#### Error: `403 Forbidden` (Listing ownership required)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Listing ownership is required"
  }
}
```

#### Error: `404 Not Found`
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Listing not found"
  }
}
```

---

## 4. `PATCH /api/v1/listings/:id`

Modifies an existing listing owned by the landlord. Modifying any substantive property automatically resets `status` to `'pending'`, clears `rejectReason` to `null`, and suspends public search visibility. Submitting identical data preserves current status.

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

### Request

- **Headers**:
  ```http
  Authorization: Bearer <valid_landlord_jwt_token>
  Content-Type: application/json
  ```
- **Path Parameters**:
  - `id`: Positive integer (BIGINT) identifying the listing.
- **Body Schema (`application/json`)**:
  All fields are optional; at least one field must be provided. Unknown fields are rejected (`.strict()`).
  ```json
  {
    "price": 3800000,
    "areaM2": 26.0,
    "description": "Phòng mới nâng cấp máy lạnh inverter, miễn phí wifi.",
    "amenityIds": [1, 2, 3, 5, 7],
    "imageUrls": [
      "https://example.com/photos/room-main-updated.jpg",
      "https://example.com/photos/room-bathroom.jpg",
      "https://example.com/photos/room-balcony.jpg"
    ]
  }
  ```

### Responses

#### Success: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "95",
    "ownerId": "5",
    "title": "Studio mini đầy đủ nội thất Bình Thạnh",
    "description": "Phòng mới nâng cấp máy lạnh inverter, miễn phí wifi.",
    "price": 3800000,
    "areaM2": 26.0,
    "address": "45/2 Điện Biên Phủ, Phường 15",
    "district": "Bình Thạnh",
    "lat": 10.796120,
    "lng": 106.705890,
    "roomType": {
      "id": 3,
      "code": "studio",
      "name": "Studio / căn hộ mini"
    },
    "status": "pending",
    "rejectReason": null,
    "coverImageUrl": "https://example.com/photos/room-main-updated.jpg",
    "amenities": [
      { "id": 1, "name": "Máy lạnh", "icon": "ac" },
      { "id": 2, "name": "Wifi", "icon": "wifi" },
      { "id": 3, "name": "Chỗ để xe", "icon": "parking" },
      { "id": 5, "name": "Nhà vệ sinh riêng", "icon": "toilet" },
      { "id": 7, "name": "Nóng lạnh", "icon": "heater" }
    ],
    "images": [
      {
        "id": "210",
        "url": "https://example.com/photos/room-main-updated.jpg",
        "isCover": true,
        "sortOrder": 0
      },
      {
        "id": "211",
        "url": "https://example.com/photos/room-bathroom.jpg",
        "isCover": false,
        "sortOrder": 1
      },
      {
        "id": "212",
        "url": "https://example.com/photos/room-balcony.jpg",
        "isCover": false,
        "sortOrder": 2
      }
    ],
    "createdAt": "2026-11-18T14:10:00.000Z"
  }
}
```

#### Error: `403 Forbidden` (Listing ownership required)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Listing ownership is required"
  }
}
```

#### Error: `404 Not Found`
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Listing not found"
  }
}
```

---

## 5. `DELETE /api/v1/listings/:id`

Permanently deletes an existing listing owned by the landlord. Cascades removal across images, amenities, nearby places, and tenant favorites. *(Pre-existing endpoint)*.

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

### Request

- **Headers**:
  ```http
  Authorization: Bearer <valid_landlord_jwt_token>
  Content-Type: application/json
  ```
- **Path Parameters**:
  - `id`: Positive integer (BIGINT).
- **Body**: `{}` (Must be empty strict JSON object or omitted).

### Responses

#### Success: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "101",
    "deleted": true
  }
}
```

#### Error: `403 Forbidden`
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Listing ownership is required"
  }
}
```
