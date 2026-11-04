# Roomify Progress Against PA3 — 5 November 2026
Performed by: Codex (AI-assisted audit for Đặng Hiển) | Reviewed by: Pending team review | Edited by: Codex

## Basis and limits
Performed by: Codex | Reviewed by: Pending team review | Edited by: Codex

Assignment source: the supplied `PA3/PA3-2026.pdf`, worth 90 points across A–F.
Repository baseline: `hiedan/Roomify`, `develop` commit
`0a120d704f9c712270294134c4ad4265855c9110`. Findings below describe that
baseline, followed by this initial setup increment. They are evidence of
repository readiness, not an estimated grade or a certification of files held
elsewhere. Jira, external Drive submissions and team meetings were not audited.
The official PA3 deadline and TA feedback were not supplied.

`main` is 33 commits behind `develop`. The remote `HIEN` branch diverges with
one unique ProjectPlan commit and 29 commits behind `develop`; the other checked
member branches have no commits ahead of `develop`. There were no open pull
requests when inspected. Start new work from `develop`; do not reset or overwrite
the existing `HIEN` branch or any local unpublished work.

## PA3 requirement comparison
Performed by: Codex | Reviewed by: Pending team review | Edited by: Codex

| PA3 part | Points | Evidence on baseline | Remaining work / status |
| --- | ---: | --- | --- |
| A — Revised Project Plan | 5 | `docs/management/ProjectPlan.md` exists with a proposed Sprint 3 plan and ownership. Its assignment label still says PA2, and Sprint 3 calendar dates remain pending. | Revision against TA feedback is unverified. No `Changes.md` exists on `develop`; PA3 explicitly gives no points for A without documented changes. |
| B — Detailed Vision | 5 | `docs/ProjectProto.md`, proposal and research files contain product descriptions, features and competitor information. `docs/requirements/README.md` is effectively empty. | No consolidated, revised Vision document or shared `Changes.md` was found. Coverage of detailed functional/NFR requirements and user environments cannot be certified. |
| C — Use-Case Model | 10 | The repository contains an ERD (`docs/analysis-and-design/ERD_Roomify.mmd`) and 22 written use cases. | No Mermaid use-case diagram was found on `develop`. The ERD does not satisfy C. Add actors, applicable include/extend/generalization relationships and traceability to all Vision functions. |
| D — Use-Case Specifications | 45 | `use-case_1.md` covers UC-01–UC-11; `use-case_2.md` covers UC-12–UC-22. There are 24 image references backed by 24 tracked prototype PNGs, covering all 22 UCs. Main/alternative flows and pre/postconditions are present in the inspected text. | Substantial draft progress, not complete acceptance. Part 2 describes actors in prose without explicit Actor(s) fields. Screenshots were not visually audited for every basic and alternative flow. Reconcile contradictory auth requirements and verify full Vision/diagram/spec/prototype coverage. |
| E — One Spec Kit functional group end-to-end | 20 | Auth spec, plan, tasks, research, data model, quickstart and API contract exist. React login/register/dashboard code exists. Express scaffold, PostgreSQL migration, Jest and Supertest exist. | Auth service/controllers/routes/middleware and auth tests are absent. Only the health endpoint is implemented. UI mock success is not real authentication; no UI → API → persistent account flow is verified. No narrated YouTube demo link was found. |
| F — AI and Weekly Reports | 5 | Project Plan lists reporting duties, and existing Jira/Git evidence images are tracked. | No standalone PA3 AI usage log, actual Sprint Planning/Scrum/Sprint Review records or demonstrably current PA3 Jira evidence was found. Planned meetings are not meeting records. |

Submission gaps on `develop`: no report PDFs, final PA3 ZIP, narrated YouTube
demo link or dedicated exported Git log was found. Existing Git evidence images
do not by themselves establish that the required current commit history is shown.
Prepare English Markdown and matching PDFs, contributor metadata immediately
after each section heading, current Git/Jira evidence and `PA3-Group13.zip`.
Exclude dependency folders, build outputs and private environment files.

## Authentication findings that affect acceptance
Performed by: Codex | Reviewed by: Pending team review | Edited by: Codex

1. `frontend/src/api/authApi.js` catches network failures and API rejection alike,
   returning a fake user and token. Invalid credentials can therefore appear
   successful in the prototype. Remove that behavior during Person B's integration.
2. The frontend calls `http://localhost:5000/api/v1`, while backend defaults to
   port 3000. Vite has no API proxy and Express has no browser CORS setup.
3. The contract returns `data.user` and `data.token`; pages read `response.user`.
   Error text should come from `error.message`, not a top-level `message`.
4. `AuthContext` stores only a local user object. It does not persist/send a real
   token, validate `/auth/me` before restoring access, or implement standard versus
   remembered storage. `ProtectedRoute` is only a browser UI guard.
5. UC-01 allows tenant/landlord selection, ordinary email and Google/Facebook
   registration, followed by a redirect to login. Auth spec instead requires
   Gmail-only tenant registration with an immediate session and excludes OAuth.
   UC-02/UC-03 also describe social login/password reset outside this auth slice.
   Decide the PA3 implemented slice and align the documents without silently
   treating the wider product use cases as implemented.
6. `spec.md` says auth backend/session code already exists, but it does not on
   this baseline. Several headings and list markers are also escaped rather than
   normal Markdown. Correct the factual status and formatting before submission.
7. `config.js` currently defaults to a development signing secret and always
   declares 7d expiry. T004/T019 must enforce safe signing configuration and
   1h/7d lifetimes. Missing signing configuration must not leave an account created
   without its required initial session.
8. The users table has a case-sensitive unique email constraint; normalized,
   concurrent registration and existing mixed-case data need DB-aware treatment
   in T009/T011. Do not rely solely on a pre-insert duplicate query.
9. FR-022 mandates an atomic role/status audit record, while T036/T040 and the
   data model describe logging as optional/planned. The admin seed and minimal
   admin UI/account-selection flow also lack clear execution tasks. Reconcile
   those gaps before US5/US6; neither is completed by adding PATCH endpoints alone.
10. Existing database names are lowercase; coding standards propose uppercase
    names. Preserve the existing schema during setup and record any agreed naming
    exception or coordinated migration. The project role value is `tenant`.

## Person A start and task status
Performed by: Codex | Reviewed by: Pending team review | Edited by: Codex

Person A is **Đặng Hiển**, responsible for backend/database work. There are 52
checkbox tasks: 3 frontend bootstrap tasks and 49 backend/shared tasks. On the
baseline all 52 were unchecked, although F001–F003 already had source files.
Checkbox counts are not weighted project-completion percentages.

This first increment completes only:

| Task | Result | Evidence |
| --- | --- | --- |
| B001 | Backend/test structure reviewed and auth file map documented | `backend/README.md` |
| B002 | Added `bcryptjs` and `jsonwebtoken`; preserved existing locked dependency versions | `backend/package.json`, `backend/package-lock.json`; dependency smoke checks |
| B003 | Documented dev/test URL selection, migrations, PostGIS setup and test-data separation; checked four configuration cases | `backend/src/config.js`, `backend/README.md` |

The root ignore file now also excludes environment variants, build outputs,
coverage and logs while retaining `.env.example`. B001–B003 are checked in
`tasks.md`; T004–T049 remain unchecked. Frontend task markers are left for
Person B to confirm. Database setup documentation is complete; an actual
PostgreSQL migration/test run is still pending.

Next execution order:

1. T004–T009: hashing/token service, database-backed identity, role guards,
   controllers, routes and validation/error foundation. Agree on the existing
   API envelope, port/base URL, bearer header and storage lifetimes with Person B.
2. T010/T011, then T012–T016: registration tests and implementation. Verify one
   active tenant, normalized unique Gmail, hash-only password storage, strict
   payload validation, 201 response and immediate standard session.
3. T017–T022: login, invalid/inactive cases and expiry.
4. T023–T034: server authorization, ownership and session restore/logout; Person B
   connects the real UI and removes mock success.
5. T035–T045: role/status administration, after reconciling atomic audit, seed and
   admin UI tasks. Finish T046–T049 and record actual end-to-end evidence.

## Verification record
Performed by: Codex | Reviewed by: Pending team review | Edited by: Codex

Runtime used: Node.js 24.22.1, npm 11.9.0. This does not certify compatibility
with every Node.js version allowed by the plan.

| Check | Outcome |
| --- | --- |
| Backend auth dependency installation | Passed; no existing locked dependency version changed |
| bcrypt hash/compare smoke checks | Passed for matching and wrong passwords; library checks, not auth endpoint tests |
| JWT smoke checks | Passed for 3600/604800-second lifetimes, expiry rejection and incorrect signing key; library checks only |
| Config selection | Four cases passed: development/test defaults, explicit development/test URLs, and port override; no DB connections |
| `npm run lint` in backend | Passed with two pre-existing unused-disable warnings; zero errors |
| Isolated `tests/app.test.js` run | All 3 scaffold API tests passed; DB global setup intentionally omitted for this isolated check |
| `npm ci` and `npm run build` in frontend | Passed; build output is not committed |
| Full `npm test` in backend | Blocked during global migration setup: `ECONNREFUSED` at local PostgreSQL port 5432. No DB or auth acceptance pass is claimed. |

Reproduce the isolated scaffold check from `backend/`:

```bash
npx jest --runInBand --config '{"testEnvironment":"node","testMatch":["**/tests/app.test.js"]}'
```

## AI usage entry for this increment
Performed by: Codex | Reviewed by: Pending team review | Edited by: Codex

On 5 November 2026 (Vietnam time), Codex read the supplied PA3 assignment,
inspected repository source and branch comparisons, drafted this progress audit
and the backend setup guide, installed the two planned auth dependencies,
annotated configuration selection, updated ignore patterns and B001–B003 markers,
and ran the checks above. Human review is pending. This entry covers this
increment only; it is not the team's complete PA3 AI usage report and does not
claim earlier meetings, reviews or implementations occurred.
