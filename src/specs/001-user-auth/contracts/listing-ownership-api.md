# Listing ownership integration contract (T025/T027)

Scope authorized for this handoff: implement the server-side deletion in
[UC-17](../../../../docs/PA3%20-%20use-case%20specification/use-case_2.md#uc-17-delete-listing).
There is no listing mutation in the working tree. The available
`origin/MinhKhang24120336` listing implementation was inspected: it provides only
public approved-listing pagination, not edit/delete. It is not merged here.
This minimal integration adds deletion only, without listing UI, creation,
editing, search, maps, moderation or upload behavior. No public read is made private.

## DELETE /api/v1/listings/:id

- Header: `Authorization: Bearer <token>`.
- `id`: canonical positive decimal PostgreSQL BIGINT string, never a JS Number.
- Request body: absent or `{}`; unsupported fields are `400 VALIDATION_ERROR`.
  Query parameters never supply identity, role or ownership.
- Policy: an active landlord may permanently delete only their own listing.
  Tenant and admin roles have no inherited landlord-owner permission.
- Success: `200 { "success": true, "data": { "id": "123", "deleted": true } }`.
  No listing content, owner profile, credential or token is returned.
- Deletion removes associated `listing_images`, `listing_amenities`,
  `nearby_places` and `favorites` through the existing database foreign-key cascades.
  Shared amenity definitions and user accounts remain. No filesystem upload exists.
- The server composes `requireAuth`, `requireRole('landlord')`,
  `requireOwnership`, then the deletion controller. Inside one transaction the
  service locks/revalidates the current actor, then locks/revalidates the listing
  owner. The DELETE also includes `WHERE id = $1 AND owner_id = $2`. A middleware
  snapshot alone never authorizes a write. Errors rollback all cascades and release
  the client; rollback failure discards it while preserving the original failure.

| Condition | Status / code |
|---|---|
| Guest, invalid/expired token, deleted actor | 401 `UNAUTHORIZED` |
| Inactive actor | 403 `INACTIVE_ACCOUNT` |
| Non-landlord actor or non-owner (including ownership changed before write) | 403 `FORBIDDEN` |
| Invalid/out-of-range ID, non-empty/invalid body | 400 `VALIDATION_ERROR` |
| Missing listing, including deletion before transactional recheck | 404 `NOT_FOUND` |
| Invalid signing configuration | 500 `AUTH_CONFIG_ERROR` |
| Unexpected database/transaction failure | 500 `INTERNAL`, generic public message |

Authorization precedes body validation and no rejected request returns private
listing fields. A repeated authorized delete receives 404; it does not invent a
successful deletion. The owning listing feature still supplies UC-15/UC-17 UI and
other CRUD operations. This contract is not evidence for those unimplemented flows.
