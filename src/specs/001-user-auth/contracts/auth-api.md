# Auth API Contract

## Authentication endpoints

### POST /api/v1/auth/register

**Purpose**: Create a new tenant account.

**Request body**

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "  NGUYEN.A@GMAIL.COM  ",
  "password": "StrongPass!123",
  "rememberMe": false
}
```

**Success response (200 or 201)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "fullName": "Nguyễn Văn A",
      "email": "nguyen.a@gmail.com",
      "role": "tenant",
      "isActive": true
    },
    "token": "jwt-token",
    "expiresIn": 3600
  }
}
```

**Error responses**
- `VALIDATION_ERROR` for bad input
- `EMAIL_CONFLICT` when email already exists after normalization

### POST /api/v1/auth/login

**Purpose**: Authenticate an existing user.

**Request body**

```json
{
  "email": "user@gmail.com",
  "password": "StrongPass!123",
  "rememberMe": true
}
```

**Success response**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@gmail.com",
      "role": "landlord",
      "isActive": true
    },
    "token": "jwt-token",
    "expiresIn": 604800
  }
}
```

**Error responses**
- `INVALID_CREDENTIALS` for unknown users or wrong password
- `INACTIVE_ACCOUNT` when the user exists but is disabled

### GET /api/v1/auth/me

**Purpose**: Retrieve the current signed-in user from the server.

**Headers**

```http
Authorization: Bearer <jwt>
```

**Success response**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "fullName": "Nguyễn Văn A",
    "email": "nguyen.a@gmail.com",
    "role": "tenant",
    "isActive": true
  }
}
```

**Error responses**
- `UNAUTHORIZED` for missing/invalid token
- `INACTIVE_ACCOUNT` for disabled accounts

### POST /api/v1/auth/logout

**Purpose**: Clear browser-side session material and optionally invalidate the token client state.

**Success response**

```json
{
  "success": true,
  "data": { "loggedOut": true }
}
```

## Admin endpoints

### PATCH /api/v1/admin/users/:id/role

**Purpose**: Change a non-admin user's role.

**Request body**

```json
{
  "role": "landlord"
}
```

**Restrictions**
- Only active admin users can invoke this route.
- `admin` -> `tenant/landlord` and `tenant` -> `admin` are not allowed.
- Unsupported roles are rejected.

### PATCH /api/v1/admin/users/:id/status

**Purpose**: Disable or re-enable a non-admin account.

**Request body**

```json
{
  "isActive": false
}
```

**Restrictions**
- Only active admin users can call it.
- Admin target accounts cannot be deactivated through this flow.

## Authorization contract

Protected routes must enforce the following rule set:

- Guest users cannot access protected resources.
- Tenant users may not access landlord-only and admin-only operations.
- Landlord users may not access admin-only operations.
- Admins can access admin-only operations but not the private data of another user unless specifically allowed by the respective business rule.
- Current DB role and `is_active` status are authoritative on each request.
