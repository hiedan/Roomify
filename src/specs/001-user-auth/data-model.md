# Data Model: User Authentication and Role Management

## Entity: User

Represents an authenticated account in Roomify.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | bigint | PK, generated | Database-generated primary key |
| full_name | varchar(100) | required | Human-readable name used at registration |
| email | varchar(255) | required, unique, normalized to lowercase | Must be a Gmail address |
| password_hash | varchar(255) | required | Hash only, never plaintext |
| phone | varchar(20) | optional | Existing schema field, may remain nullable |
| role | varchar(20) | required, default `tenant` | One of `tenant`, `landlord`, `admin` |
| is_active | boolean | required, default true | Blocks inactive accounts from login and protected operations |
| created_at | timestamptz | required | Auditing timestamp |

### Validation rules
- Email is trimmed and lowercased before uniqueness checks.
- Password must meet the documented minimum strength policy.
- Public registration cannot create `landlord` or `admin` roles.
- Only non-admin accounts can be role-switched or disabled by an admin.

## Entity: Session

Represents a browser session without a dedicated database table in v1.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| token | string | required | JWT payload issued to browser |
| user_id | bigint | required | Subject carried in token |
| role | string | required | Role snapshot for route-level checks |
| expires_at | timestamp | required | 1h or 7d based on remember-me |
| remember_me | boolean | optional | Controls token lifetime |

### Validation rules
- Expired tokens are rejected.
- Inactive or deleted users cannot keep valid sessions.
- If role or status changes after login, protected requests must check the current DB state before authorizing the request.

## Entity: Admin Action Audit (planned)

A lightweight audit record should exist for administrative changes.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | bigint | PK | Audit row ID |
| actor_user_id | bigint | required | Active admin making the change |
| target_user_id | bigint | required | User being changed |
| action_type | varchar(30) | required | e.g. `role_change`, `account_disable`, `account_enable` |
| previous_value | varchar(255) | optional | Old role or status |
| new_value | varchar(255) | optional | New role or status |
| created_at | timestamptz | required | Audit timestamp |

### Relationship notes
- A user may have many audit rows as actor or target.
- The audit table is useful for compliance and troubleshooting even when not explicitly required by the current API surface.

## Relationship summary
- Users have one current role and one activity status.
- Auth sessions are derived from the user identity and expire according to their remember-me setting.
- Admin actions affect one target user and create an audit record.
