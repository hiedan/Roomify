# Roomify Coding Standards

**Status:** Proposed team standard  
**Suggested repository location:** `docs/coding-standards.md`

## 1. Purpose and Scope

These standards support the Roomify Constitution by keeping code readable, consistent, and easy to integrate. MUST indicates a requirement; SHOULD indicates a recommendation.

The naming defaults below apply to new code unless the team's chosen language or framework requires another convention. Such exceptions MUST be recorded in this document or the relevant module README and applied consistently. This document does not select Roomify's technology stack or architecture.

## 2. Naming Conventions

Identifiers MUST use meaningful English names. User-facing text MAY use the application's supported languages. Avoid vague names such as `data1`, `temp`, and `x` outside small, obvious local contexts.

| Element | Default convention | Roomify examples |
| --- | --- | --- |
| Variables and parameters | `camelCase`; descriptive nouns | `monthlyRent`, `listingId`, `searchFilters` |
| Functions and methods | `camelCase`; action verbs | `searchListings()`, `createListing()`, `sendMessage()` |
| Classes and types | `PascalCase`; singular nouns | `ListingService`, `SearchFilters`, `Message` |
| Fixed application constants | `UPPER_SNAKE_CASE` | `DEFAULT_PAGE_SIZE`, `MAX_LISTING_IMAGES` |
| Boolean values | Clear predicates, usually `is`, `has`, or `can` | `isAvailable`, `hasParking`, `canEditListing` |
| Collections | Plural nouns | `listings`, `messages`, `imageUrls` |
| Identifier fields | Entity name followed by `Id` | `userId`, `listingId`, `conversationId` |
| General source files and folders | `kebab-case` | `listing-service`, `search-filters` |
| Class or component files | Match the exported class or component where the framework follows this pattern | `ListingService`, `ListingCard` |

File examples omit extensions because these depend on the chosen stack. Framework-required filenames MUST be preserved. Ordinary local values do not become uppercase constants merely because they cannot be reassigned.

Use these domain terms consistently:

- `renter`: a user looking for accommodation.
- `landlord`: a user offering accommodation.
- `room`: the accommodation unit; `listing`: its published advertisement. Use the term that matches the data model rather than treating them as interchangeable.
- `conversation`: a chat thread; `message`: one item within it.

## 3. Formatting

- Code MUST use the repository's shared formatter configuration. For new modules without an established style, use two spaces for indentation unless the chosen language requires another convention.
- The team MUST commit the formatter and linter configuration appropriate to its stack. Quote style, semicolons, and wrapping MUST follow that configuration.
- Contributors MUST remove unused imports, accidental debug output, and trailing whitespace. Avoid formatting unrelated files in a feature change.

## 4. Code Organization and Comments

- Files MUST follow the agreed project structure. UI rendering, business rules, and data access SHOULD have separate responsibilities within that architecture.
- Functions SHOULD perform one clear task. Reuse shared logic when it avoids meaningful duplication; do not add abstractions without a practical need.
- Comments SHOULD explain business rules or non-obvious decisions. Public interfaces MUST document unclear inputs, outputs, and failure behavior. Remove obsolete comments and commented-out code.

## 5. Data and API Names

- JSON fields MUST use `camelCase`, such as `listingId` and `monthlyRent`, unless an existing external contract requires otherwise.
- For a relational database, use plural `UPPER_SNAKE_CASE` table names, such as `LISTINGS`, `CONVERSATIONS`, and `SAVED_SEARCHES`. Column names MUST use lowercase `snake_case`, such as `monthly_rent` and `landlord_id`. For a document database, use plural collection names and `camelCase` document fields.
- If REST endpoints are used, resource paths MUST use lowercase plural nouns, such as `/listings` and `/conversations/{conversationId}/messages`. Multiword path segments MUST use `kebab-case`.
- API and database naming changes MUST be coordinated and documented. Map storage names to API names explicitly when they differ. Never rename an existing contract solely for style without handling affected consumers.

## 6. Validation and Error Handling

Inputs MUST be validated at the trusted application boundary. Protected operations MUST verify authorization, including ownership where required. Errors MUST be handled explicitly; user-facing responses MUST avoid exposing secrets or internal implementation details. Credentials and environment-specific secrets MUST remain outside committed source files.

## 7. Verification and Review

Before merging, contributors MUST run relevant formatting, linting, build, and test commands where configured. New features and fixes MUST include appropriate tests or documented verification steps covering applicable normal, boundary, and invalid-input cases. Another team member SHOULD review naming, architecture, and interface changes when practical.

## 8. Maintaining This Standard

Changes MUST follow the Constitution's amendment process: discuss them with the team, record them in version control, and update affected artifacts. Preserve established conventions in existing modules until the team agrees on a coordinated change.
