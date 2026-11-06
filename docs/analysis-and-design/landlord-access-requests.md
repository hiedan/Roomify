# Landlord access applications

Product clarification, 2026-11-06: self-registration always creates a tenant.
After signing in, the user selects **Trở thành chủ trọ**, supplies contact/property
information and waits for administrator review. Submitting never grants a role.
This is approval of access to posting, separate from approval of a rental listing.

## Stored information

`landlord_requests` stores the applicant ID, contact name, phone, proposed property
address, optional message, status, reviewer, review time and rejection reason.
The application does not overwrite the account's name or profile contact fields.

- `contactName`: trimmed, 2–100 characters.
- `phone`: 9–15 digits, optionally formatted with `+`, spaces, parentheses or hyphens.
- `propertyAddress`: trimmed, 5–255 characters.
- `message`: optional, trimmed, at most 1000 characters.
- Rejection requires a trimmed reason of 5–500 characters.

One pending application per account is enforced by a partial unique index.
Rejected applicants can submit a new application; past decisions remain stored.
Application contact information is visible only to its owner and administrators.
This form collects declared contact information; it does not verify property
ownership or identity documents.

## API

All endpoints are below `/api/v1`, use the existing Bearer session and standard
`{ success, data }` / `{ success: false, error }` envelopes. IDs are decimal strings.

| Method/path | Access | Body or result |
|---|---|---|
| GET `/landlord-requests/me` | Active account | `{ application: latest or null, currentRole }` |
| POST `/landlord-requests` | Active tenant | `{ contactName, phone, propertyAddress, message? }`; 201, `{ application }` |
| GET `/admin/landlord-requests?status=pending` | Active admin | `{ applications, limit: 100 }`; filter also accepts `approved` or `rejected` |
| PATCH `/admin/landlord-requests/:id` | Active admin | `{ decision: "approved" }` or `{ decision: "rejected", reason }`; `{ application, user, changed }` |

Pending duplicates return 409 `REQUEST_PENDING`. A contradictory decision on an
already reviewed application returns 409 `REQUEST_REVIEWED`; repeating the same
decision returns `changed: false` without another role audit. Invalid IDs/fields
return 400. Guests and unsupported roles cannot submit or review applications.
Inactive applicants must be reactivated before approval through the review API.

The legacy `PATCH /admin/users/:id/role` endpoint also requires a pending
application for an actual tenant-to-landlord grant; otherwise it returns 409
`LANDLORD_REQUEST_REQUIRED`. A valid legacy grant records approval of that pending
application in the same transaction. Tenant demotion and no-op role assignments
retain their existing behavior.

## Transactions and browser behavior

Submission locks the current account and revalidates active/tenant state before
inserting. Review locks actor/applicant accounts in numeric ID order, rechecks
administrator authorization, then locks the application. Approval commits the
decision, role change and existing `admin_action_audits` record together; a failure
rolls them all back. Rejection leaves the role unchanged. Neither action issues a
new token or changes the server's existing JWT lifetime/revocation behavior.

`/dashboard` and `/become-landlord` fetch the latest application. While pending,
they poll every 10 seconds when the document is visible, refresh on window focus
and allow manual refresh. If the server reports a different current role, the
existing AuthContext revalidates `/auth/me` and updates the profile. Polls and form
requests are aborted on unmount; protected content is still controlled by the
existing provider and server authorization.

The administrator queue at `/admin#landlord-requests` shows real applications,
allows approval/rejection in a confirmation dialog and filters reviewed history.
It loads at most 100 applications per filter; approving pending entries and
reloading reveals the next entries. No email delivery or admin provisioning is
included. An existing administrator account is required to use this queue.

## Local setup and verification

Configure the Roomify application and separate Roomify-Test Supabase projects
using the root README. From `backend/`, run `npm.cmd run migrate` for Roomify and
`npm.cmd run db:check` to inspect its connection, schema history and PostGIS.
The additive migration `1700000002000_landlord_requests.js` adds the request
table/indexes and does not reset data; applied migrations must not be edited.
Integration/browser fixtures use only the validated Roomify-Test project and run
sequentially. Both projects can use the database name `postgres`; project
references, runtime/migration identity checks and verified TLS provide the
configured connection boundary. No Docker database service is required.

```powershell
# backend/
npm.cmd test -- --testTimeout=30000 --silent
npm.cmd run lint

# frontend/ (after backend tests finish)
npm.cmd run test:e2e
npm.cmd run build
```

Historical verification checkpoint, before the Supabase migration: 649 backend
tests passed across 19 suites; 37 Chromium
browser cases passed, including real application submission, administrator
approval/rejection, resubmission and profile/role refresh with the same token.
Backend lint has zero errors and two pre-existing warnings. Frontend production
build and `git diff --check` passed. These recorded results do not assert a new
Supabase verification run. Synthetic browser-only screenshot fixtures
were inspected at 320px and 1440px; they are separate from the real API tests.
