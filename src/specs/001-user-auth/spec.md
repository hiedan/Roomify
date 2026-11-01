**# Feature Specification: User Authentication and Role Management**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



**\*\*Working Git Branch\*\***: \`Nghia\`  |  **\*\*Spec Kit Feature Directory\*\***: \`src/specs/001-user-auth/\`



**\*\*Created\*\***: 2026-10-31



**\*\*Status\*\***: Draft — repository-grounded and ready for team review.



**\*\*Input\*\***: User description: "Prepare the specification for Roomify's User Authentication and Role Management feature, assigned to Đặng Hiển as functional group E for PA5, using the supplied spec template and the current GitHub repository."





This feature lets users establish their identity and access Roomify according to their current account role and status. The repository already contains registration, login, current-user retrieval, session restoration, and browser logout code. Role-restricted business operations and administrator role/status management require additional implementation. This specification defines the intended acceptance baseline; it does not certify that the existing code passes these requirements.



**## User Scenarios & Testing&#x20;**_\*(mandatory)\*_

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



“Tenant” is the repository's term for a renter. Persisted roles are exactly \`tenant\`, \`landlord\`, and \`admin\`. A guest is an unauthenticated visitor, not a fourth account role.



The stories below can be verified separately using prepared accounts and data. Registration is not a prerequisite for testing login or authorization: those stories can use pre-provisioned fixtures. Tests that isolate authorization policy do not replace integration tests against the actual protected business operations.



**### User Story 1 - Register a Tenant Account (Priority: P1)**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



As a new visitor, I want to register with my full name, Gmail address, and password so that I can use Roomify with a personal tenant account.



**\*\*Why this priority\*\***: Account creation is the entry point for new users and must preserve the registration contract already implemented in the repository.



**\*\*Independent Test\*\***: Start signed out with an unused Gmail address, register, and verify one active tenant account and an authenticated account view. Check persistence without implementing any listing workflow.



**\*\*Acceptance Scenarios\*\***:



1\. **\*\*Given\*\*** a signed-out visitor and an unused valid Gmail address, **\*\*When\*\*** they submit a valid full name and password, **\*\*Then\*\*** exactly one active tenant account is created and a standard authenticated session is established.

2\. **\*\*Given\*\*** an address containing surrounding spaces and uppercase letters, **\*\*When\*\*** registration succeeds, **\*\*Then\*\*** the address is trimmed and converted to lowercase before uniqueness checking and storage.

3\. **\*\*Given\*\*** an existing account, **\*\*When\*\*** another registration uses the same normalized address, **\*\*Then\*\*** registration returns an email-conflict error and creates no additional account.

4\. **\*\*Given\*\*** an invalid name, non-Gmail address, or password outside the documented limits, **\*\*When\*\*** registration is submitted, **\*\*Then\*\*** the input is rejected with a useful message and no account or session is created.

5\. **\*\*Given\*\*** a registration request containing \`role\`, \`is_active\`, or another unsupported field, **\*\*When\*\*** it reaches the server, **\*\*Then\*\*** the request is rejected; a visitor cannot create a landlord or administrator account through public registration.



**---**



**### User Story 2 - Sign In with an Existing Account (Priority: P1)**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



As a registered tenant, landlord, or administrator, I want to sign in using Gmail and password so that I can access the functions allowed for my account.



**\*\*Why this priority\*\***: Login connects existing accounts to protected workflows and must behave consistently for all three roles.



**\*\*Independent Test\*\***: Prepare active accounts for each role and an inactive account. Verify successful and unsuccessful sign-ins without relying on registration or business-feature screens.



**\*\*Acceptance Scenarios\*\***:



1\. **\*\*Given\*\*** an active account and valid credentials, **\*\*When\*\*** the user signs in, **\*\*Then\*\*** the server returns a session and a safe profile containing the account's current role.

2\. **\*\*Given\*\*** syntactically valid credentials for an unknown address or an incorrect password, **\*\*When\*\*** sign-in is attempted, **\*\*Then\*\*** both cases return the same invalid-credentials response and establish no session.

3\. **\*\*Given\*\*** an inactive account and the correct password, **\*\*When\*\*** sign-in is attempted, **\*\*Then\*\*** access is rejected as an inactive account and no session is issued.

4\. **\*\*Given\*\*** an active account, **\*\*When\*\*** the user signs in without selecting “Remember me,” **\*\*Then\*\*** a session with a one-hour lifetime is used and the browser stores its credential in session storage.

5\. **\*\*Given\*\*** an active account, **\*\*When\*\*** the user selects “Remember me” and signs in, **\*\*Then\*\*** a session with a seven-day lifetime is used and its credential is stored persistently in that browser.

6\. **\*\*Given\*\*** an unavailable authentication service or failed connection, **\*\*When\*\*** sign-in is attempted, **\*\*Then\*\*** the interface leaves the user signed out, explains the failure, and permits retry without reporting success.



**---**



**### User Story 3 - Access Only Authorized Functions and Resources (Priority: P1)**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



As an authenticated user, I want Roomify to apply my current role and resource ownership consistently so that protected functions and private data are accessible only to authorized accounts.



**\*\*Why this priority\*\***: Role names alone do not protect business operations. Server enforcement is required before landlord and administrator workflows can be considered complete.



**\*\*Independent Test\*\***: Use prepared guest, tenant, landlord, and administrator identities plus owner/non-owner resource fixtures to exercise the permission matrix. Use isolated policy tests first, then actual business endpoints when their owning features are integrated.



**\*\*Acceptance Scenarios\*\***:



1\. **\*\*Given\*\*** a guest or an invalid or expired session, **\*\*When\*\*** a protected operation is requested, **\*\*Then\*\*** authentication is required and no protected data is returned or changed.

2\. **\*\*Given\*\*** an active tenant, **\*\*When\*\*** a landlord-only or administrator-only operation is requested directly, **\*\*Then\*\*** the server denies access even if the browser interface was modified.

3\. **\*\*Given\*\*** an active landlord and a listing they own, **\*\*When\*\*** an allowed listing-management operation is requested, **\*\*Then\*\*** authorization succeeds subject to the listing feature's other business rules.

4\. **\*\*Given\*\*** an active landlord and another landlord's listing, **\*\*When\*\*** an ownership-restricted edit or deletion is requested, **\*\*Then\*\*** access is denied and the listing is unchanged.

5\. **\*\*Given\*\*** an active administrator, **\*\*When\*\*** an administrator-only operation is requested, **\*\*Then\*\*** authorization succeeds; administrative status does not automatically grant another user's private-data or landlord-owner permissions.

6\. **\*\*Given\*\*** a role or account-status change after login, **\*\*When\*\*** the existing session makes its next protected request, **\*\*Then\*\*** the server applies the current stored role and status rather than a cached browser value.



**---**



**### User Story 4 - Restore and End a Browser Session (Priority: P1)**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



As a signed-in user, I want Roomify to restore a valid session after reload and let me sign out of the current browser so that account access is predictable.



**\*\*Why this priority\*\***: Session restoration and logout already exist in the interface and must remain consistent with session expiry and server account checks.



**\*\*Independent Test\*\***: Use an existing account to log in, reload, simulate expiry or account deactivation, and sign out. Verify browser state and protected requests independently of other features.



**\*\*Acceptance Scenarios\*\***:



1\. **\*\*Given\*\*** a stored session credential, **\*\*When\*\*** the application reloads, **\*\*Then\*\*** it shows a checking state and retrieves the current account from the server before displaying a protected account view.

2\. **\*\*Given\*\*** an expired or invalid credential, or a deleted or inactive account, **\*\*When\*\*** restoration or a protected request is rejected, **\*\*Then\*\*** the unusable browser session is cleared and the user is returned to sign-in with an appropriate explanation.

3\. **\*\*Given\*\*** a valid remembered session, **\*\*When\*\*** the same browser is reopened before expiry, **\*\*Then\*\*** the session can be restored after successful server validation.

4\. **\*\*Given\*\*** a signed-in user, **\*\*When\*\*** they sign out, **\*\*Then\*\*** credentials in both browser storage locations and the in-memory account state are cleared; reload and back navigation cannot restore an authenticated view from that cleared state.

5\. **\*\*Given\*\*** a transient failure while checking a stored session, **\*\*When\*\*** validation cannot complete, **\*\*Then\*\*** protected content remains unavailable and a clear recovery or sign-in action is offered; the interface does not claim authentication succeeded.

6\. **\*\*Given\*\*** a copied, otherwise valid access token, **\*\*When\*\*** the user signs out in the browser, **\*\*Then\*\*** this version does not promise server-side revocation of that copy. Its use remains subject to expiry and current account/authorization checks.



**---**



**### User Story 5 - Manage Non-Administrator Roles (Priority: P2)**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



As an administrator, I want to assign tenant or landlord access to an existing non-administrator account so that role changes follow a controlled process.



**\*\*Why this priority\*\***: Public registration currently creates tenants only. A controlled assignment workflow completes role management without allowing self-escalation. This workflow is a proposed extension to the existing repository.



**\*\*Independent Test\*\***: Prepare one active administrator and tenant/landlord targets. Use a minimal administrator account-management view to change a role, verify persistence and the audit record, and check the target's next protected request.



**\*\*Acceptance Scenarios\*\***:



1\. **\*\*Given\*\*** an active administrator and an existing tenant, **\*\*When\*\*** the administrator assigns the landlord role, **\*\*Then\*\*** the assignment is saved, confirmed, and audited.

2\. **\*\*Given\*\*** an existing non-administrator account, **\*\*When\*\*** the administrator assigns either supported non-administrator role, **\*\*Then\*\*** the account retains exactly one role and its identity and owned data are preserved.

3\. **\*\*Given\*\*** a successful role change and an existing target-user session, **\*\*When\*\*** that session next requests a protected operation, **\*\*Then\*\*** the new permissions apply without requiring password disclosure or trusting stale client state.

4\. **\*\*Given\*\*** a guest, tenant, or landlord, **\*\*When\*\*** they request role management, **\*\*Then\*\*** the operation is denied and no role or audit-of-success record is changed.

5\. **\*\*Given\*\*** an unsupported role, an attempted administrator grant, an administrator target, or a missing target account, **\*\*When\*\*** a change is requested, **\*\*Then\*\*** it fails with the applicable validation, permission, or not-found response.



**---**



**### User Story 6 - Disable and Re-enable Non-Administrator Accounts (Priority: P2)**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



As an administrator, I want to disable or re-enable a non-administrator account so that account access can be controlled without deleting its history.



**\*\*Why this priority\*\***: The existing account model and authentication service already recognize inactive accounts, but a supported management workflow is missing.



**\*\*Independent Test\*\***: Prepare an active administrator and a non-administrator target with an existing session. Disable the target, test login and the existing token, then re-enable it and verify access and audit records.



**\*\*Acceptance Scenarios\*\***:



1\. **\*\*Given\*\*** an active non-administrator account, **\*\*When\*\*** an administrator disables it, **\*\*Then\*\*** the status is persisted and audited, and both new sign-ins and the next protected request from an existing session are denied.

2\. **\*\*Given\*\*** an inactive non-administrator account, **\*\*When\*\*** an administrator re-enables it, **\*\*Then\*\*** it can sign in again with valid credentials. A retained, unexpired token can also become usable again under the existing token design.

3\. **\*\*Given\*\*** a status change, **\*\*When\*\*** it succeeds, **\*\*Then\*\*** the account, role, listings, and other owned records are retained; changing account status does not itself change listing moderation or availability.

4\. **\*\*Given\*\*** a non-administrator requester, an administrator target, or a missing account, **\*\*When\*\*** status management is attempted, **\*\*Then\*\*** the request fails without modifying account data.



**### Edge Cases**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



\- Concurrent registrations using the same normalized address create at most one account; the conflicting attempt receives the duplicate-address response.

\- Gmail addresses with dots or plus tags remain distinct strings unless they normalize to the same trimmed, lowercase value. No mailbox-alias equivalence is assumed.

\- Full names at lengths 1, 2, 100, and 101 after trimming, and passwords around both the minimum length and the 72-byte UTF-8 limit, require boundary checks.

\- Unicode passwords must be checked against both the string-length and byte-length rules. Passwords are not trimmed, lowercased, or silently truncated.

\- Malformed input, unsupported fields, invalid JSON, and a non-boolean “remember” value are rejected before account changes.

\- Missing or malformed authorization headers, invalid signatures, expired tokens, and tokens whose accounts no longer exist cannot grant access.

\- A valid token does not bypass account deactivation or a changed role. Unknown role values grant no protected business permission.

\- Changing the target identifier in a URL or request body does not bypass role or ownership checks.

\- During restoration, no protected account content is displayed before server validation completes.

\- Signing in after a remembered session replaces the previous browser credential rather than leaving competing credentials in both storage locations.

\- Repeated clicks cannot create duplicate UI submissions; a failed request leaves controls usable for retry.

\- Role/status changes and their audit records must succeed together. A database failure must not produce a false success message.

\- Missing authentication configuration must fail safely; registration must not create an account if the server cannot issue its initial session.

\- Re-enabling an account does not invalidate previously issued tokens by itself. Global token revocation is outside this version.



**## Requirements&#x20;**_\*(mandatory)\*_

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



**### Functional Requirements**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



\- **\*\*FR-001\*\***: The system MUST recognize exactly one current role per account: tenant, landlord, or administrator. It MUST NOT treat guest access as a persisted role or assume automatic inheritance between account roles.

\- **\*\*FR-002\*\***: Registration MUST accept full name, Gmail address, and password. Names MUST be trimmed and contain 2–100 UTF-16 code units; email MUST be trimmed, lowercased, syntactically valid, at most 255 code units, and end with \`@gmail.com\`.

\- **\*\*FR-003\*\***: Passwords MUST contain at least 8 characters. If the implementation uses bcrypt, passwords MUST NOT exceed 72 UTF-8 bytes; the implementation MUST reject longer inputs rather than silently truncate them. Passwords MUST be compared exactly and MUST NOT be normalized.

\- **\*\*FR-004\*\***: Registration and login MUST reject malformed input and unsupported fields. Public requests MUST NOT accept a client-selected role or account activation status.

\- **\*\*FR-005\*\***: Successful self-registration MUST create one active tenant account and establish a standard session. A normalized duplicate address MUST return an email-conflict response, including under concurrent requests.

\- **\*\*FR-006\*\***: Passwords MUST be stored as secure hashes. Responses, interface content, and logs MUST NOT expose passwords, password hashes, signing secrets, or session credentials outside their required authentication exchange/storage.

\- **\*\*FR-007\*\***: Login MUST verify the normalized Gmail address and exact password. For otherwise valid input, an unknown account and an incorrect password MUST return the same invalid-credentials response.

\- **\*\*FR-008\*\***: Correct credentials for an inactive account MUST NOT establish a session. Protected requests by inactive accounts MUST also be denied.

\- **\*\*FR-009\*\***: Successful registration and login MUST return a session and a safe account representation containing ID, full name, normalized email, and current role. Current-user retrieval MUST return that safe representation.

\- **\*\*FR-010\*\***: Standard registration/login sessions MUST expire one hour after issue. Login with “Remember me” MUST issue a seven-day session. Session storage MUST be used for standard sessions and local browser storage for remembered sessions.

\- **\*\*FR-011\*\***: On successful registration or login, the interface MUST clear older credentials from both storage locations before storing the new credential in the selected location.

\- **\*\*FR-012\*\***: Restoration MUST validate the stored credential with the server before rendering protected content. Expired, invalid, deleted-account, or inactive-account sessions MUST be cleared. Network failures MUST show a recoverable state without granting access.

\- **\*\*FR-013\*\***: Logout MUST clear both browser storage locations and in-memory account state. This release MUST describe logout as ending the current browser session; server-side token revocation and logout from all devices are not included.

\- **\*\*FR-014\*\***: Every protected operation MUST authenticate the requester and use the account's current server-held role and active status. Browser state, form fields, and previously cached role values MUST NOT determine authorization.

\- **\*\*FR-015\*\***: Unauthenticated or invalid-session requests MUST be rejected as unauthorized. Authenticated requests lacking a required role MUST be rejected as forbidden, without performing the protected read or mutation.

\- **\*\*FR-016\*\***: Ownership-restricted operations MUST verify the authenticated account against the stored resource owner. Being a landlord alone MUST NOT permit changing another landlord's listing.

\- **\*\*FR-017\*\***: The interface MUST display the current role and expose appropriate navigation/actions. Direct navigation to protected functions MUST result in sign-in or an access-denied state when required; hiding controls MUST NOT replace server checks.

\- **\*\*FR-018\*\***: Active administrators MUST have a minimal account-management workflow to identify an existing non-administrator account and assign either tenant or landlord access. Only the minimum account details needed for the task may be displayed.

\- **\*\*FR-019\*\***: In-application role management MUST NOT grant the administrator role, edit an administrator target, or let non-administrators change their own role. The first administrator account MUST be created through a controlled database seed. The seed MUST hash the password before storage, MUST be limited to development/demo setup, and MUST NOT expose default credentials in the public application.

\- **\*\*FR-020\*\***: Active administrators MUST be able to disable or re-enable existing non-administrator accounts through the management workflow. These changes MUST retain account identity, role, and owned records.

\- **\*\*FR-021\*\***: A saved role or status change MUST affect the target's next protected request, including requests using an already-issued token. These changes MUST NOT implicitly delete data or alter listing moderation/availability.

\- **\*\*FR-022\*\***: Successful role and status changes MUST record actor ID, target ID, action, previous value, new value, and timestamp. The change and audit record MUST commit atomically; failures MUST leave no partial successful change.

\- **\*\*FR-023\*\***: Management operations MUST validate target identity and allowed values, reject missing targets with a not-found response, and re-check authorization before committing a change. Unsupported roles or states MUST never be persisted.

\- **\*\*FR-024\*\***: Authentication APIs MUST preserve the existing response envelope: \`{ success, data, error }\`. Expected statuses are 201 for registration; 200 for successful login/current-user retrieval; 400 for invalid input; 401 for invalid credentials/session; 403 for an inactive account or insufficient permission; 404 for a missing management target; and 409 for duplicate registration.

\- **\*\*FR-025\*\***: Sign-up, sign-in, session checking, account display, and account management MUST provide clear loading, success, validation, and service-failure states. Repeated submission MUST be prevented while an operation is pending.

\- **\*\*FR-026\*\***: These workflows MUST support labeled fields, keyboard operation, and responsive layouts. Required controls and error/recovery messages MUST remain readable on the supported desktop and mobile browser layouts.



**### Permission Matrix**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



The table defines the authorization contract for integration with other functional groups. It does not claim their business endpoints already exist. All signed-in permissions require an active account and remain subject to the owning feature's business rules.



\| Capability | Guest | Tenant | Landlord | Administrator |

\|---|---|---|---|---|

\| Read approved public listing information | Allowed | Allowed | Allowed | Allowed |

\| Read the signed-in account's safe profile | Denied | Own account | Own account | Own account |

\| Manage a tenant's favorites | Denied | Own favorites | Not granted | Not granted |

\| Create or edit/delete landlord listings | Denied | Denied | Own listings only | Not granted by this role |

\| Approve or reject listings | Denied | Denied | Denied | Allowed |

\| Assign tenant/landlord roles to non-admin accounts | Denied | Denied | Denied | Allowed |

\| Disable/re-enable non-admin accounts | Denied | Denied | Denied | Allowed |



Public listing visibility remains governed by the listing/discovery specifications. Administrator moderation does not confer landlord ownership. Permissions for messaging, reviews, notifications, analytics, and AI requests must be defined by their own feature specifications and enforced through the same authentication/authorization boundary.



**### Key Entities&#x20;**_\*(include if feature involves data)\*_

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



\- **\*\*Account\*\***: A registered person identified by an immutable account ID, full name, normalized unique email, private password credential, one role, active/inactive status, and creation time. The existing schema also contains optional phone data, which is not a required registration field.

\- **\*\*Role\*\***: One of tenant, landlord, or administrator. It describes eligible capabilities; it does not replace ownership or other business rules. A separate role table is not required by this specification.

\- **\*\*Authentication Session\*\***: A time-limited authenticated identity with an issue/expiry time and a browser persistence choice. In the current design it is represented by an access token; no server-side session/revocation table is present.

\- **\*\*Owned Resource\*\***: A listing or private user resource associated with an account ID. Ownership is checked against authoritative stored data rather than a requester-supplied owner value.

\- **\*\*Role/Status Change Record\*\***: A persistent audit record linking an administrator, a non-administrator target, the changed attribute, old/new values, and time. This requires a new database migration because it is absent from the inspected migration.



**## Success Criteria&#x20;**_\*(mandatory)\*_

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



**### Measurable Outcomes**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



These are acceptance targets to verify, not measurements already achieved.



\- **\*\*SC-001\*\***: All valid registration cases create exactly one active tenant account; 100% of invalid-input, injected-role, and normalized-duplicate cases reject the request without an unintended account.

\- **\*\*SC-002\*\***: Login fixtures cover all three roles, inactive accounts, unknown addresses, and incorrect passwords. All expected outcomes match the specification, with zero unauthorized successful sign-ins and no password/hash disclosure.

\- **\*\*SC-003\*\***: Every permission-matrix row is checked for all four actor categories, with owner/non-owner cases where applicable. All expected denials prevent protected disclosure or mutation. Final integration evidence uses actual business endpoints; isolated policy tests alone are insufficient.

\- **\*\*SC-004\*\***: Standard and remembered sessions have lifetimes of 3,600 and 604,800 seconds respectively. Requests at or after expiry are denied; reload and browser-reopen checks follow the selected persistence mode.

\- **\*\*SC-005\*\***: Logout leaves no Roomify session credential in either browser storage location and no signed-in account in application state. Reload/back-navigation checks show no authenticated content from the cleared session.

\- **\*\*SC-006\*\***: Every verified role/status change is persisted with one matching audit record, and the target's next protected request uses the updated permissions/status. A failed update leaves both account state and successful-change audit records unchanged.

\- **\*\*SC-007\*\***: All required authentication and management workflows can be completed with a keyboard. At proposed acceptance viewport widths of 320 and 1280 CSS pixels, required fields, actions, and feedback remain readable and usable without horizontal page scrolling.

\- **\*\*SC-008\*\***: All required acceptance scenarios have recorded results against an identified integrated build before the feature is marked complete. Every failed case links to a defect and subsequent verification; unexecuted cases are identified explicitly.



**## Open Questions & Decisions**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa

The following decisions are the proposed PA5 baseline for this feature. They should be confirmed by the project team/instructor before implementation is treated as final. The Gmail-only rule in OQ-004 is intentionally retained.

| ID | Topic | Decision | Status |
|---|---|---|---|
| OQ-001 | Administrator account management scope | PA5 includes a basic administrator interface and backend APIs to assign Tenant/Landlord roles and enable/disable non-administrator accounts. The interface is limited to account search/listing and these management actions; no advanced dashboard is required. | Proposed for team approval |
| OQ-002 | Initial administrator provisioning | Create the first administrator account through a controlled database seed. Hash the password before storage; use seed credentials only in development/demo environments and do not expose default credentials in the public application. | Proposed for team approval |
| OQ-003 | Session lifetime and Remember me | Standard sessions expire after one hour. Remember-me sessions expire after seven days. The backend must enforce expiry; the browser storage choice must follow the selected persistence mode. | Proposed for team approval |
| OQ-004 | Gmail-only registration | Registration and login accept Gmail addresses only. Other email providers are rejected. Email normalization remains trim plus lowercase; Gmail dots and plus-tags are not treated as equivalent aliases. | Proposed for team approval |
| OQ-005 | Input limits | Full names contain 2–100 characters after trimming; email addresses are limited to 255 characters. Passwords contain at least 8 characters. If bcrypt is used, passwords are limited to 72 UTF-8 bytes and longer values are rejected, never truncated. | Proposed for team approval and implementation verification |
| OQ-006 | Audit history | Persist an audit record for each successful role or account-status change, including actor, target, action, old value, new value, and timestamp. Only administrators may view the history. Retain records for the duration of the PA5 project; automatic deletion/retention automation is out of scope. | Proposed for team approval |

**## Assumptions**

**\*\*Performed by:\*\*** Đặng Hiển  | **\*\*Reviewed by:\*\*** Nguyễn Hữu Nghĩa | **\*\*Edited by:\*\*** Nguyễn Hữu Nghĩa



\- **\*\*A-001 — Role assignment policy\*\***: Retain tenant-only public registration. PA5 includes a basic administrator interface and backend APIs for assigning tenant/landlord roles and enabling/disabling non-administrator accounts. Successful changes are persistently audited. These are proposed PA5 requirements pending team/instructor approval, not behavior already implemented.

\- **\*\*A-002 — Administrator provisioning\*\***: At least one administrator and appropriate synthetic tenant/landlord fixtures are provisioned through a controlled database seed. The seed hashes the administrator password and is used only in development/demo environments. No public administrator-registration endpoint is allowed. In-app administrator grants and administrator-account modification are excluded.

\- **\*\*A-003 — One role per account\*\***: Multi-role accounts, choosing a different role during login, and self-service role switching are excluded. Role changes preserve account and resource history; they do not automatically transfer ownership.

\- **\*\*A-004 — Existing authentication boundaries\*\***: Registration and login remain Gmail-only. Names are limited to 2–100 characters after trimming and emails to 255 characters. Passwords require at least 8 characters; the 72-byte UTF-8 maximum applies when bcrypt is used. Standard and remembered sessions last one hour and seven days respectively. Logout clears the current browser session only. These are proposed PA5 acceptance rules pending team approval; Gmail format validation does not verify mailbox ownership.

\- **\*\*A-005 — Excluded authentication extensions\*\***: Password recovery/change, verification email, Google/Apple OAuth, MFA, refresh tokens, server-side token revocation, all-device logout, and account deletion are outside this version. Disabled social buttons or a “Forgot password” placeholder do not constitute implemented support.

\- **\*\*A-006 — Feature boundaries\*\***: This feature owns identity, session behavior, permission policy/enforcement, and the minimal role/status administration workflow. Listing CRUD, moderation business logic, favorites, maps, chat, reviews, notifications, analytics, and AI recommendations remain with their owning groups. They depend on this authorization contract.

\- **\*\*A-007 — Technical dependencies\*\***: Reuse the current React frontend and Node.js/Express backend, PostgreSQL/PostGIS database, configured signing secret, existing response conventions, and versioned migrations. Any audit-data schema change must use a new migration and an updated ERD. Production sessions require appropriate HTTPS and browser-script protection.

\- **\*\*A-008 — Integration baseline\*\***: The auth implementation inspected on main must be included in the eventual feature/integration branch before extension work. The inspected HIEN and develop heads do not contain it. AGENTS.md names “dev” as the integration branch, but the available branch list contains “develop” and no “dev”; the implementation plan must record the team's actual merge target rather than assume one.

\- **\*\*A-009 — Course context and attribution\*\***: “E” is the user's team-assigned functional-group label. The supplied PA5 handout has sections A–D. The performer is the user-assigned feature owner; AI assistance is declared. Peer-review attribution remains pending until an actual reviewer completes the work.

\- **\*\*A-010 — Verification handoff\*\***: This document supplies acceptance criteria, not the final PA5 Test Plan, executed Test Cases, Bug Report, plan.md, or tasks.md. The team-wide PA5 package must still include at least 50 functional cases across at least five explicit use cases, at least ten per selected use case, AI functional checks, actual execution records, and the other required deliverables. Test files were inspected but not executed during this specification task.


