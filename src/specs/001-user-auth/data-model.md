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

## Entity: Admin Action Audit (`admin_action_audits`)

Implemented by migration `1700000001000_admin_action_audits.js`. FR-022 makes
auditing mandatory for actual role/status changes, despite T040's conditional
wording. No-op requests return the current safe profile and `changed: false`
without changing the user row or adding an audit record.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | bigserial | PK, generated | Audit row ID; read by Node.js as an exact string |
| actor_user_id | bigint | required, FK users(id), ON DELETE RESTRICT | Active admin making the change |
| target_user_id | bigint | required, FK users(id), ON DELETE RESTRICT | Non-admin user being changed |
| action_type | varchar(30) | required, checked | `role_change`, `account_disable`, or `account_enable` |
| previous_value | varchar(20) | required, checked | Original `tenant`/`landlord` or literal `true`/`false` |
| new_value | varchar(20) | required, checked | New role or literal boolean string |
| created_at | timestamptz | required, default current_timestamp | Database transaction timestamp |

### Relationship notes
- A user may have many audit rows as actor or target.
- Actor and target IDs must differ. Role audit values must be distinct tenant/landlord values; disable is exactly `true` -> `false`, enable is exactly `false` -> `true`.
- Indexes cover `(target_user_id, created_at)` and `actor_user_id`.
- Foreign keys retain referenced user identity by rejecting physical deletion. Status changes never delete users or owned/history rows; account deletion is outside this version.
- No password, hash, token or unrelated profile data is stored. No audit viewer endpoint/UI is implemented here.

### Atomic update and authorization

Both admin operations use a single checked-out PostgreSQL connection. After
`BEGIN`, the service locks actor/target rows with `ORDER BY id FOR UPDATE`, using
database numeric ordering and exact string IDs. It re-checks the active admin
actor and non-admin target under those locks, updates only the selected user
field, inserts the corresponding audit row, and commits. Any failure rolls back;
connections are released, with broken connections discarded if rollback fails.
No-op handling occurs only after authorization and target checks.

The ERD is maintained in
[`ERD_Roomify.mmd`](../../../docs/analysis-and-design/ERD_Roomify.mmd).

## Relationship summary
- Users have one current role and one activity status.
- Auth sessions are derived from the user identity and expire according to their remember-me setting.
- Admin actions affect one target user and create an audit record.
