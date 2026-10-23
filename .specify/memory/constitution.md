<!--
Sync Impact Report (temporary review material; remove before committing)
Version change: 1.0.0 -> 1.1.0
Baseline: tracked src/.specify/memory/constitution.md, version 1.0.0,
ratified 2026-10-16. The repository-root destination was an unfilled scaffold.
Modified principles (titles preserved):
- I. User-Centered Design: scope traceability and measurable acceptance criteria.
- II. Code Quality and Maintainability: justified complexity and AI-code accountability.
- III. Test-First and Verification: verification planning, risk-based coverage, and evidence.
- IV. Consistent Architecture and Integration: contracts and listing lifecycle separation.
- V. Security and Data Integrity: ownership checks and grounded AI recommendations.
Added sections: none; Technical Constraints, Development Workflow, and Governance expanded.
Removed sections: none.
Version rationale: MINOR; materially expanded guidance without removing existing principles.
Context: docs/PA1_Team_Contract.md, docs/ProjectProto.md,
docs/project_proposal_part_2.md, docs/management/ProjectPlan.md, and backend implementation.
Template: constitution-template resolved through the repository-root resolver.
Follow-up TODOs: none. No unresolved placeholders remain.
Scope: only this constitution is updated; templates and application files are unchanged.
-->
# Roomify Constitution

## Core Principles

### I. User-Centered Design

Every feature MUST identify a tenant, landlord, or administrator need and link that need to
documented requirements and testable acceptance criteria. Room discovery through maps, search,
and reliable listing details MUST guide prioritization within the agreed scope. Interface
changes MUST define success, empty, loading, and error states where applicable and MUST be
verified for responsive use and keyboard access in the affected workflow.

Scope changes MUST be recorded with their rationale and impact on the sprint plan before
implementation. Planned capabilities MUST be distinguished from working capabilities so that
stakeholders can assess actual progress.

### II. Code Quality and Maintainability

Code MUST follow the conventions and directory structure of the affected module. Functions
and modules MUST have clear responsibilities; contributors MUST remove unnecessary duplication
and debugging code before merge. Non-obvious logic and significant design decisions MUST be
documented with their purpose and trade-offs.

New dependencies, architectural layers, or infrastructure MUST have a documented need that
existing project facilities cannot reasonably meet. Contributors MUST understand, review, and
verify AI-assisted code and remain responsible for its correctness. This keeps the system
maintainable within the team's course schedule and resources.

### III. Test-First and Verification

Before implementation, each feature or fix MUST define its acceptance criteria and appropriate
tests or documented verification steps. Before merge, verification MUST cover the affected
normal flow, boundary conditions, invalid input, and relevant failure paths. Automated tests
MUST cover changes to API contracts, database behavior, authentication, and authorization;
documented manual checks MAY cover interface behavior that lacks suitable automation.

Integration checks MUST exercise the real interfaces affected by a change. A functional group
MUST be verified across its applicable UI, API, and persistence layers before it is declared
complete. Test records MUST state the command or procedure, environment, result, and any
unexecuted checks or blockers. Static checks or mocked tests MUST NOT be reported as successful
database or external-service integration tests.

For PA5, the team MUST retain at least fifty functional test cases across at least five use
cases, with at least ten cases per selected use case and functional checks for the AI feature,
as specified in the Project Plan. Failed cases MUST link to defects and subsequent verification
of fixes. Verification begins in earlier sprints rather than waiting for final delivery.

### IV. Consistent Architecture and Integration

Features MUST follow the agreed architecture and existing interfaces. Changes to API endpoints,
request/response formats, shared data structures, or database schemas MUST document the
contract, affected consumers, and required integration work before merge. Database changes
MUST use version-controlled migrations and document their data impact and recovery approach.
Breaking changes MUST include a coordinated migration plan for affected consumers.

Listing moderation status MUST remain distinct from room availability. Discovery results MUST
respect both the moderation and availability rules defined in the feature specification.
Integration defects MUST be resolved before the affected feature is marked complete. These
rules prevent inconsistent behavior between listing management, discovery, and administration.

### V. Security and Data Integrity

The server MUST validate untrusted input and enforce role and resource-ownership checks for
every protected operation. Client controls and AI output MUST NOT substitute for server-side
authorization. Passwords MUST be stored as secure hashes; database operations MUST use
parameterized queries and preserve applicable integrity constraints. Error responses and logs
MUST NOT expose credentials, tokens, or private user data.

Secrets MUST remain outside committed files and be supplied through environment configuration
or an equivalent secret facility. Test and demonstration data MUST be synthetic or used with
permission. Access to messages, favorites, account data, and administrative functions MUST be
limited to authorized users.

AI room recommendations MUST be grounded in retrieved listing data and MUST respect the same
access and visibility rules as ordinary search. The assistant MUST NOT invent listing facts,
prices, availability, or policies. Its specification and verification MUST cover unsupported
requests, no matching listings, and provider failure. Only the data needed for the supported
request MAY be sent to an external AI service; credentials and unrelated private data MUST NOT
be included.

## Technical Constraints

- The current backend baseline is JavaScript on Node.js with Express, PostgreSQL/PostGIS,
  and versioned migrations. Changes to this baseline MUST include a documented team decision
  and an integration or migration plan; the baseline does not assert completed features.
- Frontend technology, map provider, and AI provider MUST be selected through documented
  feasibility decisions covering integration, configuration, usage limits, and cost. A proposal
  MUST NOT be presented as an approved dependency or an implemented service.
- Source code, tests, documentation, and configuration MUST remain in their designated
  directories. Setup instructions MUST identify required configuration and dependencies using
  examples without secrets. API and schema documentation MUST track the implemented contracts.
- Product and performance requirements MUST state measurable acceptance criteria and the
  environment in which they are checked. Unconfirmed targets MUST be labeled as proposals.
- The initial scope excludes processing real rental payments or deposits, legally binding
  rental contracts or legal advice, guarantees about every listing or landlord, integration
  with every rental service, commercial availability guarantees, and AI capabilities beyond
  agreed room recommendations. Expanding these boundaries MUST follow the team's recorded
  scope-change process.
- Project documents MUST use English and Markdown, Mermaid diagrams where appropriate, and
  the performed/reviewed/edited attribution required by the assignment. Required submission
  PDFs MUST match their Markdown sources. Planned assignments, reviews, and dates MUST NOT be
  presented as completed work or confirmed participation.

## Development Workflow

- Before work begins, each task MUST exist in Jira with exactly one performer, a different
  reviewer, acceptance criteria, and expected completion dates. Dependencies and blockers MUST
  be recorded when identified; task status MUST reflect actual progress.
- Feature implementation MUST be traceable through Spec Kit requirements, an implementation
  plan, and ordered tasks. Plans MUST check this constitution before implementation. Relevant
  artifacts MUST be updated when requirements or design decisions change.
- Contributors MUST use dedicated feature or fix branches. Each change MUST have a clear
  purpose, meaningful commits, and review by another team member before merge. Review MUST
  check correctness, maintainability, security, contracts, verification evidence, and compliance
  with this constitution. Contributors MUST resolve conflicts and verify the merged result.
- Before a task is marked Done, its required output, relevant lint and verification checks,
  integration evidence, documentation updates, and review feedback MUST be complete. Missing
  environments or credentials MUST be reported as blockers rather than recorded as passing
  checks. Defects affecting acceptance criteria MUST remain open until fixes are verified.
- Sprint Planning, two Scrum meetings per sprint, and Sprint Review MUST follow the Team
  Contract. The team MUST record actual decisions, progress, blockers, and scope adjustments
  in project documents and Jira. Forecast work MUST remain labeled as forecast until agreed.
- AI usage records MUST identify actual assistance and human validation. Course deliverables
  MUST retain the required Spec Kit artifacts, test evidence, Git history, and reports. Claims
  of completion, review, approval, or submission MUST have supporting evidence.

## Governance

This constitution governs Roomify specifications, plans, tasks, implementation, and review.
For Spec Kit commands run from the repository root, `.specify/memory/constitution.md` is the
active constitution. Version 1.1.0 preserves the applicable principles and original ratification
date from the tracked `src/.specify/memory/constitution.md` baseline.

The Team Contract defines collaboration and decision-making responsibilities. Proposed
constitutional amendments MUST document the problem, changed rules, affected artifacts, and
any migration work. The team MUST discuss amendments and use consensus or, if consensus cannot
be reached, the majority-vote process in `docs/PA1_Team_Contract.md`. The amendment record MUST
identify the decision and date without claiming approval that has not occurred.

Constitution versions MUST follow semantic versioning: MAJOR for incompatible principle
removals or redefinitions, MINOR for new principles or materially expanded guidance, and PATCH
for clarifications that do not change obligations. Amendments MUST update the version and last
amended date while preserving the original ratification date.

Every implementation plan and change review MUST assess compliance. Conflicts MUST be resolved
before affected work is declared complete; deviations MUST be documented with their rationale,
impact, team decision, and follow-up work. A deviation that contradicts a mandatory principle
requires a constitutional amendment before merge. Dependent specifications and plans MUST be
reconciled during their own workflows; this command does not modify templates or source code.
The team MUST revisit governance at sprint reviews and after significant scope or architecture
changes. The temporary Sync Impact Report MUST be removed before committing this amendment.

**Version**: 1.1.0 | **Ratified**: 2026-10-16 | **Last Amended**: 2026-10-22
