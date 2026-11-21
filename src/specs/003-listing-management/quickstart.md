# Quickstart & Verification Guide: Comprehensive Listing Management

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

**Feature**: [spec.md](./spec.md)

**API Contract**: [contracts/listing-management-api.md](./contracts/listing-management-api.md)

**Data model**: [data-model.md](./data-model.md)

This guide documents runnable validation scenarios that prove the Comprehensive Listing Management feature behaves correctly end-to-end, maintaining data integrity, ownership isolation, and moderation lifecycle invariants.

---

## Prerequisites & Environment Setup

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

- Node.js 18+ and npm installed.
- A configured Roomify application PostgreSQL project and a separate, explicitly configured Roomify-Test PostgreSQL project, as verified by `backend/src/databaseConfig.js`.
- Required environment variables in `backend/.env` (or `.env.test` for test runs):
  ```env
  PORT=3000
  NODE_ENV=test
  
  # Dedicated Roomify-Test Supabase project (strictly separated from application project)
  TEST_SUPABASE_PROJECT_REF=abcdefghijklmnopqrst
  TEST_DATABASE_URL=postgres://postgres.abcdefghijklmnopqrst:your_test_password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
  
  # JWT signing secret (minimum 32 UTF-8 bytes required by authService.js)
  JWT_SECRET=roomify-dev-secret-key-32-bytes-long-123456
  ```

Run schema check and migrations against the isolated Roomify-Test project:
```powershell
cd backend
npm.cmd run db:check:test
npm.cmd run migrate:test
```

---

## Test Execution

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

Run code linting and the automated test suites using the exact scripts from `backend/package.json`:

```powershell
# 1. Run ESLint across backend files
npm.cmd run lint

# 2. Run backend unit test suite
npm.cmd run test:unit

# 3. Run complete test suite (unit + integration against Roomify-Test) in band
npm.cmd test -- --runInBand
```

---

## Core Verification Scenarios

**Performed by:** Từ Thái Hưng | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Từ Thái Hưng

### Scenario 1: Create a New Listing (UC-13 & UC-14)

**Objective**: Verify that a landlord can create a listing with 1–10 photo URLs, valid room type, and map coordinates, resulting in status `'pending'`.

**Steps**:
1. Authenticate as an active landlord (`role = 'landlord'`, `is_active = true`) to obtain a JWT token.
2. Send a `POST /api/v1/listings` request with camelCase payload:
   ```json
   {
     "title": "Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM",
     "description": "Phòng mới xây, ban công thoáng mát.",
     "price": 3500000,
     "areaM2": 25.5,
     "address": "268 Lý Thường Kiệt, Phường 14",
     "district": "Quận 10",
     "lat": 10.772583,
     "lng": 106.657806,
     "roomTypeId": 1,
     "amenityIds": [1, 2],
     "imageUrls": ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
   }
   ```
3. **Expected Results**:
   - HTTP status `201 Created`.
   - Response envelope `{ "success": true, "data": { ... } }` containing `id`, `ownerId = req.user.id`, `areaM2 = 25.5`, `status = "pending"`, and `rejectReason = null`.
   - Database record in `listings` has `geom = ST_SetSRID(ST_MakePoint(106.657806, 10.772583), 4326)::geography`.
   - Table `listing_images` contains 2 rows: image 0 has `is_cover = true` (`isCover = true`), image 1 has `is_cover = false` (`isCover = false`).
   - Listing is NOT returned in public search queries (`GET /api/v1/listings`).

---

### Scenario 2: View and Filter Owned Listings (UC-15)

**Objective**: Verify that a landlord can query their own listings portfolio, filter by status, inspect counts, and read rejection notes.

**Steps**:
1. Seed the database with:
   - 2 `pending` listings for Landlord A.
   - 1 `approved` listing for Landlord A.
   - 1 `rejected` listing for Landlord A (with `reject_reason = "Thiếu giấy phép kinh doanh"`).
   - 3 listings for Landlord B.
2. As Landlord A, call `GET /api/v1/listings/mine`.
3. **Expected Results**:
   - Standard response envelope: `{ "success": true, "data": { "listings": [...], "summary": { ... } } }`.
   - Exactly 4 listings returned in `data.listings`, all with `ownerId = Landlord A`.
   - Zero listings belonging to Landlord B are returned.
   - Response `data.summary` contains `{ "total": 4, "pending": 2, "approved": 1, "rejected": 1 }`.
   - Each item in `data.listings` contains full `description`, `images` array (`[{ id, url, isCover, sortOrder }]`), and `amenities` array.
   - The rejected listing explicitly includes `rejectReason = "Thiếu giấy phép kinh doanh"`.
4. Call `GET /api/v1/listings/mine?status=rejected`.
5. **Expected Results**:
   - Exactly 1 listing returned in `data.listings` with `status = "rejected"`.

---

### Scenario 3: Retrieve and Modify Listing & Reset Moderation (UC-16)

**Objective**: Verify pre-populating edit form via `GET /mine/:id` and modifying an `approved` or `rejected` listing updates data, resets `status` to `'pending'`, and clears `rejectReason`.

**Steps**:
1. Call `GET /api/v1/listings/mine/:id` for an owned `rejected` listing.
   - **Expected Result**: HTTP `200 OK` returning the full listing with `images`, `amenities`, and `rejectReason`, proving frontend can load it for editing even though public `GET /:id` rejects non-approved listings.
2. Pick an `approved` listing owned by Landlord A.
3. Send `PATCH /api/v1/listings/:id` with camelCase payload:
   ```json
   {
     "price": 4000000,
     "areaM2": 28.0,
     "description": "Đã cập nhật thêm máy giặt và tủ lạnh."
   }
   ```
4. **Expected Results**:
   - HTTP status `200 OK`.
   - Response shows updated `price = 4000000`, `areaM2 = 28.0`, `status = "pending"`, and `rejectReason = null`.
   - Listing is immediately hidden from public search (`GET /api/v1/listings`) until re-approved by admin.
5. Pick a `rejected` listing owned by Landlord A.
6. Send `PATCH /api/v1/listings/:id` updating `imageUrls`.
7. **Expected Results**:
   - `status` transitions from `'rejected'` to `'pending'`.
   - Previous `rejectReason` is cleared (`null`).

---

### Scenario 4: Delete Owned Listing (UC-17)

**Objective**: Verify permanent deletion and cascade clean-up across child tables.

**Steps**:
1. Pick an owned listing that has images in `listing_images`, amenities in `listing_amenities`, and rows in `favorites`.
2. Send `DELETE /api/v1/listings/:id` with empty body `{}`.
3. **Expected Results**:
   - HTTP status `200 OK` with `{ "success": true, "data": { "id": "<id>", "deleted": true } }`.
   - Querying `listings` for this ID returns 0 rows.
   - Querying `listing_images`, `listing_amenities`, and `favorites` for this `listing_id` returns 0 rows (FK cascade verified).
   - Listing disappears from `GET /api/v1/listings/mine`.

---

### Scenario 5: Security & Guard Matrix Verification

**Objective**: Ensure role enforcement and ownership protections reject illegal requests.

| Request | Actor / Condition | Expected Status | Error Code |
|---|---|:---:|---|
| `POST /api/v1/listings` | Anonymous visitor (no token) | `401` | `UNAUTHORIZED` |
| `POST /api/v1/listings` | Authenticated Tenant (`role = 'tenant'`) | `403` | `FORBIDDEN` |
| `POST /api/v1/listings` | Landlord with 0 images | `400` | `VALIDATION_ERROR` |
| `POST /api/v1/listings` | Landlord with 11 images | `400` | `VALIDATION_ERROR` |
| `POST /api/v1/listings` | Latitude out of bounds (`lat = 95.0`) | `400` | `VALIDATION_ERROR` |
| `GET /api/v1/listings/mine` | Tenant account | `403` | `FORBIDDEN` |
| `GET /api/v1/listings/mine/:id` | Landlord A reading Landlord B's listing | `403` | `FORBIDDEN` |
| `PATCH /api/v1/listings/:id` | Landlord A editing Landlord B's listing | `403` | `FORBIDDEN` |
| `DELETE /api/v1/listings/:id` | Landlord A deleting Landlord B's listing | `403` | `FORBIDDEN` |
| `PATCH /api/v1/listings/:id` | Non-existent listing ID | `404` | `NOT_FOUND` |
| `POST /api/v1/listings` | Inactive landlord (`is_active = false`) | `403` | `INACTIVE_ACCOUNT` |
