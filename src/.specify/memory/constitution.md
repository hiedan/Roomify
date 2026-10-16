# Roomify Constitution

## Core Principles

### I. User-Centered Design
All features MUST address a clear user need. Requirements and interfaces MUST be understandable, consistent, and easy to use. UI/UX decisions SHOULD prioritize usability and accessibility.

### II. Code Quality and Maintainability
Code MUST follow the conventions of the chosen programming language and project structure. Functions and modules SHOULD have clear responsibilities. Avoid unnecessary duplication and complexity. Important logic MUST be documented when its purpose is not obvious.

### III. Test-First and Verification
New features and bug fixes MUST have appropriate tests or documented verification steps. Tests SHOULD cover normal cases, boundary conditions, and invalid inputs. Changes MUST be verified before being merged into the main development branch.

### IV. Consistent Architecture and Integration
New features MUST follow the agreed project architecture and existing interfaces. API contracts, data structures, and database changes MUST be coordinated among team members. Integration issues MUST be resolved before a feature is considered complete.

### V. Security and Data Integrity
The application MUST validate user input and handle errors safely. Sensitive configuration values MUST NOT be committed to the repository. Database operations MUST preserve data integrity, and access to protected features MUST follow the application's authorization rules.

## Technical Constraints

- The project MUST follow the technology stack and architecture agreed upon by the team.
- Source code, documentation, and configuration files MUST be organized in their designated directories.
- Database schema changes MUST be documented and version-controlled through migration files where applicable.
- API endpoints and data formats MUST be documented when introduced or changed.
- Environment-specific secrets MUST be stored outside committed source files.

## Development Workflow

- Work MUST be performed on dedicated feature branches rather than directly on the main development branch.
- Each change MUST have a clear purpose and be reviewed by another team member when practical.
- Commits SHOULD use clear messages that describe the change.
- Before merging, contributors MUST check for conflicts and run relevant tests or verification steps.
- Requirements, implementation plans, and tasks SHOULD be documented using the project's Spec Kit artifacts when applicable.
- Significant changes to requirements or architecture MUST be communicated to affected team members.

## Governance

This constitution defines the shared principles for developing and maintaining Roomify. Project decisions, specifications, implementation plans, and code changes SHOULD comply with these principles.

Amendments MUST be discussed by the team, documented in version control, and reflected in affected project artifacts. When a conflict is found, the team MUST resolve it before treating the affected work as complete.

**Version**: 1.0.0 | **Ratified**: 2026-10-16 | **Last Amended**: 2026-10-16
