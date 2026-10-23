# Project Plan
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

**Project:** Roomify — Map-Based Room Rental Platform  
**Course:** CS300 / CSC13002 — Introduction to Software Engineering  
**Group:** 13  
**Assignment:** PA2  

**Contents**
1. Introduction
2. Project Overview
3. Project Organization and Risk Management
4. Five-Sprint Plan
5. Detailed Sprint Tasks
6. Project Schedule
7. Build Plan

## 1. Introduction
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

Roomify is a map-based room rental platform designed to help tenants find suitable rental rooms and help landlords manage their room listings. Finding rental accommodation can be challenging because information is often scattered across different platforms, and users may have difficulty comparing locations, prices, amenities, and other important factors.

Roomify aims to make the rental search process more convenient by providing an interactive map, search and filtering tools, and detailed room listings. The platform also proposes supporting features such as user authentication, landlord listing management, in-app messaging, favorites, ratings and reviews, notifications, administrative moderation, and an AI-powered room recommendation chatbot.

The project will be developed by Group 13 as part of the CS300 / CSC13002 – Introduction to Software Engineering course. The team will follow the Scrum development process, organize work into sprints, track tasks through Jira, and use Git for version control and collaboration.

## 2. Project Overview
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

### 2.1 Project Goals
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

The main goal of Roomify is to develop a convenient and user-friendly platform that connects tenants looking for rental rooms with landlords offering available accommodation.

The specific goals are to:

- **Simplify room discovery:** Provide an interactive map and search tools that allow tenants to find rental rooms based on location, price, and other relevant criteria.
- **Improve listing transparency:** Display essential room information, including names or titles, images, prices, descriptions, locations, and available amenities.
- **Support landlords:** Allow landlords to create, update, and manage their room listings.
- **Facilitate communication:** Provide in-app messaging to help tenants and landlords exchange information about rental rooms.
- **Improve user experience:** Support features such as favorites, ratings and reviews, notifications, and personalized room recommendations.
- **Support platform administration:** Provide administrative functions for managing users, moderating listings, and maintaining platform quality.
- **Apply software engineering practices:** Develop the system incrementally using Scrum, Git version control, task tracking, testing, documentation, and code reviews.

These goals will guide feature prioritization and implementation throughout the project. The team will refine them as requirements become clearer and development progresses.

### 2.2 Project Scope
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

#### In Scope
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

The initial project scope includes the following functions:

- **User Authentication and Authorization:** Allow users to register, log in, and access functions according to their roles, such as tenant, landlord, and administrator.
- **Interactive Map and Room Search:** Display room locations on a map and provide search and filtering options to help tenants find suitable accommodation.
- **Room Listing Management:** Allow landlords to create, edit, update, and manage information about their rental rooms.
- **Room Details:** Display room images, prices, descriptions, locations, and other available information.
- **In-App Messaging:** Support communication between tenants and landlords regarding rental listings.
- **Favorites:** Allow tenants to save and revisit room listings they are interested in.
- **Ratings and Reviews:** Allow users to share feedback about their rental experience, subject to the system's defined rules.
- **Notifications:** Provide notifications for relevant activities and updates supported by the platform.
- **Administrative Moderation:** Allow administrators to review and manage users or listings when necessary.
- **Basic Analytics:** Provide basic information about platform activity to support administration.
- **AI-Powered Room Recommendations:** Explore an AI-powered chatbot that helps users discover rooms based on their stated preferences.

The final implementation details and priorities will be determined by the team based on available time, technical feasibility, and project requirements.

#### Out of Scope
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa
- Processing real rental payments or deposits directly through the platform.
- Providing legally binding rental contracts or legal advice.
- Guaranteeing the accuracy of every listing or the legitimacy of every landlord.
- Integrating with every third-party property rental service.
- Providing a production-scale infrastructure or guaranteeing commercial-level availability.
- Implementing advanced AI capabilities beyond the agreed room recommendation functionality.

### 2.3 Project Deliverables
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

The expected deliverables include:

- **Project documentation:** Project Plan, Vision Document, and other required course documents.
- **Requirements and design artifacts:** Documented requirements, relevant diagrams, and user workflows.
- **Working software increments:** Incremental versions of Roomify developed and tested across the planned sprints.
- **Core platform features:** Implemented features prioritized by the team, including room search, listing details, authentication, and listing management.
- **Testing artifacts:** Test cases, test results, and documented defects where applicable.
- **Source code and version history:** A Git-managed repository containing the project source code and development history.
- **Final demonstration:** A working demonstration of the completed features during the final sprint (PA5).


### 2.4 Assumptions and Constraints
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

#### Assumptions
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

- Team members will participate in assigned tasks, communicate progress, and report blockers promptly.
- The team will have access to the development tools and services needed to build and test the application.
- Tenants, landlords, and administrators will use the platform through the supported application interface.
- Room listing information and images will be available for development and demonstration purposes.
- External services, such as map providers or AI services, may be used if they are technically feasible and appropriate for the project.
- The team will refine requirements and implementation priorities as it gains feedback and technical experience.

#### Constraints
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

- The project must be completed within the course schedule and the five planned sprints.
- Development must follow the course requirements and the team's agreed Scrum workflow.
- Tasks must be tracked in Jira, and each task must have one performer and a different reviewer.
- Source code and project documents must be managed through Git.
- The implementation scope must remain realistic given the team's available time, skills, and resources.
- External APIs or services may introduce usage limits, configuration requirements, or additional costs.

These assumptions and constraints will be reviewed as the project progresses. Any significant changes to scope, schedule, or technical dependencies should be discussed by the team and reflected in the relevant project documents and Jira tasks.

## 3. Project Organization and Risk Management
**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Đỗ Quốc Đại

### 3.1 Team Structure and Roles
**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Đỗ Quốc Đại

Roomify is developed by a five-member team following Scrum. Primary roles define areas of leadership; all members contribute to development, testing, documentation and peer review.

| Member ID | Team Member | Primary Technical Role | Responsibilities | PA2 Documentation Lead |
|---|---|---|---|---|
| TV1 | Đặng Hiển | Backend Lead | Backend services/APIs, database design and integration, API consistency and technical decisions. | Project Plan: introduction, overview, sprint tasks, schedule, build plan and consolidation. |
| TV2 | Nguyễn Hữu Nghĩa | Technical & Documentation Lead | Technical documentation, diagrams, README, development procedures and technical decisions. | Organization, risk management, Jira maintenance, Spec Kit, training and Git evidence. |
| TV3 | Đỗ Quốc Đại | UI/UX Lead | Wireframes/prototypes, frontend components, usability and responsive design. | Vision introduction, positioning, stakeholders, user needs and competition. |
| TV4 | Từ Thái Hưng | Testing & Quality Lead | Test planning/cases, functional/integration testing, bug tracking and regression. | Product perspective, dependencies, feature descriptions and workflows. |
| TV5 | Võ Minh Khang | Project Manager / Scrum Coordinator | Schedule coordination, Scrum meetings, progress monitoring, deadline tracking and blocker resolution. | NFRs, AI/weekly reports, Vision integration and submission packaging. |

TV5 coordinates overall task tracking; TV2 maintains the PA2 Jira records and evidence. Documentation assignments complement technical roles. Every member remains responsible for full-stack learning and implementation contributions.

### 3.2 Shared Responsibilities and Review
**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Đỗ Quốc Đại

All members attend Sprint Planning, two Scrum meetings and Sprint Review; complete assigned work, update Jira, commit source/documents, test their contributions and report blockers promptly. Members keep the implementation, Vision, Plan and technical documentation consistent and record AI use according to the course requirements.

| Performer | Default Reviewer |
|---|---|
| TV1 | TV2 |
| TV2 | TV3 |
| TV3 | TV4 |
| TV4 | TV5 |
| TV5 | TV1 |

Each task has one performer and a different reviewer. An explicitly assigned reviewer in a task table takes precedence over the default rotation. The performer supplies the deliverable and verification evidence; the reviewer checks correctness, completeness, scope and consistency. The performer resolves findings before integration. Source authorship and source review attribution are retained when sections are consolidated.

### 3.3 Risk Register
**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Đỗ Quốc Đại

Probability and impact are initial qualitative estimates. Risks are reviewed during Scrum meetings and when a significant change occurs.

| ID | Risk | Probability | Impact | Mitigation Strategy | Monitoring Owner |
|---|---|---|---|---|---|
| R1 | Missed deadlines or member unavailability due to coursework, personal commitments or underestimated workload; dependent tasks may slip. | Medium | High | Break work into manageable Jira tasks with owners/deadlines; report blockers early; maintain review/integration buffers; split or redistribute work when needed. | TV5 |
| R2 | Scope creep or changing requirements increases workload beyond available time. | Medium | High | Maintain an agreed Plan/Vision baseline; assess value, effort and dependency impacts before accepting changes; prioritize core work and record approved changes in Jira and documents. | TV1 with TV5 |
| R3 | Technical or integration difficulties involving maps, APIs, database, authentication or AI; external quotas/costs may affect delivery. | Medium | High | Investigate dependencies early; create small prototypes; define API/data contracts; test components and document setup; monitor quotas and request technical support promptly. Use explicit error handling or supplementary demo evidence during service outages; required features still need verification. | TV1 with the affected feature owner |
| R4 | Git merge conflicts or inconsistent code/documents create duplicated work or disagreement between Plan, Vision, Jira and implementation. | Medium | Medium | Use focused branches/commits; synchronize before editing; review merges and resolve conflicts carefully; run a cross-document consistency check after integration. | TV2 |

### 3.4 Risk Monitoring and Response
**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Đỗ Quốc Đại

The monitoring owner records early warning signs, the affected tasks and the next action. If a risk occurs, TV5 coordinates an impact assessment with the performer and reviewer. The team prioritizes essential outputs, reallocates work or revises estimates, and records the agreed recovery action in Jira. Any scope or deadline change is reflected in the Plan and Vision as applicable. Risk ownership above defines monitoring responsibility; any corrective task still receives its own performer and reviewer.

## 4. Five-Sprint Plan
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

### 4.1 Five-Sprint Overview
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Sprint | Objective | Major Activities | Expected Outputs |
|---|---|---|---|
| **Sprint 1 - PA1** | Define the product and establish the working environment. | Prepare the proposal, existing-app survey, and Team Contract; establish Git, Jira, and team communication; prepare the initial technical foundation. | PA1 documents and evidence; repository structure; initial backend and database artifacts. PA1 baseline. |
| **Sprint 2 - PA2** | Establish the initial plan, vision, and Spec Kit workflow. | Prepare Project Plan and Vision; initialize Spec Kit; complete training; assess frontend, map, and AI integration feasibility; record sprint activities. | Initial planning documents, Spec Kit artifacts, training evidence, AI usage and meeting reports. PA2 baseline. |
| **Sprint 3 - PA3** | Specify the complete product and implement initial functional groups. | Revise Plan and Vision; model and specify all use cases with prototypes; implement authentication and listing management; begin map browsing and search. | Revised documents, `Changes.md`, use-case model/specifications and prototypes, working initial features, Spec Kit artifacts, and narrated demo video. Forecast. |
| **Sprint 4 - PA4** | Document the actual architecture and integrate core rental workflows. | Revise use cases; document C4 and deployment architecture; complete map browsing and search; implement additional functional groups according to capacity and dependencies. | Architecture matching the code, revised specifications, at least two additional working functional groups, generated tests, Spec Kit artifacts, and narrated demo videos. Forecast. |
| **Sprint 5 - PA5** | Complete the agreed scope, verify the product, and deliver it. | Finish remaining features early; review and execute tests; report and fix defects; update all documents; prepare reflection, final package, and demonstration. | Complete application, test records and bug reports, final documents and code, reflective report, and final demonstration. Forecast. |

### 4.2 Sprint 1 - PA1: Project Definition and Setup
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

**Objective:** Establish the Roomify product concept, team responsibilities, and development environment.

The team's PA1 work includes the following:

- Propose a responsive, map-based room rental platform for tenants, landlords, and administrators.
- Describe the proposed functional groups and AI accommodation assistant.
- Survey Nhatot and Nhatrovn, including screenshots, user flows, comparisons, and UI/UX patterns.
- Establish the Team Contract, communication rules, responsibilities, and working process.
- Set up the private GitHub repository, Jira task management, and required development tools.
- Prepare the initial backend structure, ERD, and database migration as additional development work.

**Expected outputs:** PA1 Markdown/PDF documents, relevant tool-usage and Git evidence, and an initial repository foundation. PA1 outputs form the input baseline for the subsequent sprints.

### 4.3 Sprint 2 - PA2: Planning and Product Vision
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

**Objective:** Establish an initial plan and shared understanding of product requirements while preparing the specification-driven workflow.

Planned activities:

- Prepare the Project Plan: introduction, goals, scope, deliverables, assumptions, team organization, at least three risks with mitigation strategies, five-sprint plan, schedule, and build plan.
- Prepare the Vision: purpose and references, problem and product position statements, stakeholders and users, needs, competition, product perspective, assumptions/dependencies, features, and measurable non-functional requirements.
- Describe each product feature in three to five sentences and include one or two representative Mermaid workflows.
- Initialize Spec Kit under `/src`, establish the Roomify constitution, and retain the Markdown artifacts generated during initialization.
- Complete individual Spec Kit training and collect evidence from each member.
- Confirm the frontend approach and investigate the feasibility, limits, and costs of candidate map and AI integrations.
- Prepare a specification for the first functional group to be implemented in Sprint 3.
- Conduct and document sprint meetings, maintain Jira, and record AI usage and Git history.

**Expected outputs:** Initial Project Plan and Vision in English Markdown and PDF; Spec Kit initialization artifacts; individual training evidence; AI Usage Report; meeting reports; Jira screenshots; and Git history. The documents will be revised in PA3 based on TA feedback.

### 4.4 Sprint 3 - PA3: Detailed Requirements and Initial Implementation
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

**Objective:** Specify the complete agreed scope and deliver working initial user journeys.

Required assignment activities:

- Revise the Project Plan and Vision based on TA feedback and newly available information.
- Record revisions in one `Changes.md` file, with separate sections for each revised document.
- Create Mermaid use-case diagrams covering all functional requirements in the Vision.
- Specify every modeled use case, including ID/name, actors, description, preconditions, step-by-step basic flow, all applicable alternative flows, postconditions, and special requirements where relevant.
- Provide prototype screenshots covering the basic and alternative flows of every use case.
- Implement at least one complete functional group through the Spec Kit workflow, including frontend, backend/logic, and database persistence where applicable.
- Submit complete source code, generated Spec Kit artifacts, and a narrated demo video linked through YouTube as required by PA3.
- Maintain AI usage reports, meeting reports, Jira screenshots, and Git evidence.

**Roomify implementation forecast:** Complete authentication and role management, followed by listing management. Begin map browsing and search/filtering as capacity permits. Authentication establishes protected access; listing management supplies the data needed by downstream discovery features. Listing management must distinguish moderation status from room availability.

**Expected outputs:** Revised Plan and Vision, `Changes.md`, a complete use-case model and specifications with prototypes, and at least one verified end-to-end functional group. The internal target exceeds the minimum assignment requirement to reduce the remaining implementation workload.

### 4.5 Sprint 4 - PA4: Architecture and Core Feature Integration
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

**Objective:** Integrate core rental workflows and document the architecture actually implemented.

Required assignment activities:

- Revise the use-case model and specifications in response to TA feedback and implementation findings; record revisions in `Changes.md`.
- Document the actual technology stack and external integrations.
- Create and explain Mermaid C4 Level 1 System Context and Level 2 Container diagrams.
- Create C4 Level 3 Component diagrams for representative important features in both frontend and backend containers, with responsibilities and interactions explained.
- Create a Mermaid deployment diagram mapping containers to infrastructure nodes and describing communication protocols. Local infrastructure may be represented as separate logical nodes.
- Implement at least two additional functional groups end-to-end using Spec Kit.
- Include generated tests, source code, Spec Kit artifacts, and narrated demo videos.
- Maintain AI usage reports, meeting reports, Jira screenshots, and Git evidence.

**Roomify implementation forecast:** Prioritize map-based browsing and advanced search/filtering because they form the main room-discovery workflow. Then implement favorites and administrator moderation according to available capacity. Develop direct messaging and the AI accommodation assistant after their dependencies are ready. The assistant should use actual listing data and be checked against supported requests, unavailable matches, and service failures.

The team will review progress during Scrum meetings. If the remaining Sprint 4 capacity cannot support every forecast feature, unfinished work will be assigned explicitly to the beginning of Sprint 5 in Jira and the Project Schedule. At least two additional functional groups must still be completed end-to-end for PA4.

**Expected outputs:** Revised use-case documents, `Changes.md`, architecture and deployment documentation consistent with the code, at least two additional complete functional groups, generated tests, Spec Kit artifacts, and demonstration evidence.

### 4.6 Sprint 5 - PA5: Completion, Verification, and Final Delivery
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

**Objective:** Complete every agreed functional group and demonstrate a verified, integrated application.

Planned activities:

- Complete remaining agreed features early in the sprint. The current forecast includes ratings and reviews, notifications, basic analytics, and any work explicitly carried over from Sprint 4.
- Prepare a Test Plan covering objectives/scope, tested features, environment/tools, schedule/responsibilities, and entry/exit criteria.
- Select at least five use cases and design at least ten functional test cases per selected use case, for a minimum of fifty test cases. Include functional correctness checks for the AI feature.
- Review and understand all previously generated tests; correct expected results, improve descriptions, add missing edge cases, and extend coverage where needed.
- Execute all designed test cases and record IDs, execution dates, pass/fail status, and actual results.
- Link each failed case to at least one bug report. Record bug ID, description, reproduction steps, expected/actual results, severity, and status. Retain records of defects found and fixed even when the final run passes.
- Fix defects, rerun affected tests, perform regression testing, and summarize results per feature.
- Update all PA1–PA5 documents to match the final product and architecture.
- Write the Reflective Report, including team experience, Spec Kit, AI tooling, SDLC feedback, and each member's three-to-five-sentence reflection.
- Prepare a live product demonstration of approximately fifteen minutes, showing two or three key user workflows and a technical overview. Every member presents at least one feature or section.
- Package final documents, source code, all Spec Kit artifacts, tests, and AI usage records as `PA5-Group13.zip`, excluding dependency directories and generated build artifacts.

**Expected outputs:** All agreed product features functioning together; test plan/cases/results, linked bug reports and summary; updated Markdown/PDF documents; complete source code and Spec Kit artifacts; Reflective Report; final package; and a rehearsed product demonstration. The official demo date and venue remain subject to course announcements.

### 4.7 Functional Coverage and Dependencies
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

The following mapping covers the eleven capabilities listed in the current Roomify plan, including the AI accommodation assistant. It is a forecast to be checked against the approved Goals and Scope.

| Capability | Target Completion | Main Dependency |
|---|---|---|
| Authentication and role management | Sprint 3 | Agreed roles and user data model |
| Listing management | Sprint 3 | Authentication, images, and listing data model |
| Interactive map-based browsing | Sprint 4; start in Sprint 3 | Listings with valid geographic coordinates and selected map integration |
| Advanced search and filtering | Sprint 4; start in Sprint 3 | Listing fields, amenities, and geographic search rules |
| Favorites and saved listings | Sprint 4, subject to capacity | Authenticated users and available listings |
| Admin moderation dashboard | Sprint 4, subject to capacity | Role authorization and listing moderation lifecycle |
| Direct in-app messaging | Sprint 4–5 | Authenticated tenants/landlords and listing context |
| AI accommodation assistant | Sprint 4–5; feasibility work in Sprint 2 | Listing retrieval, structured search criteria, and selected AI integration |
| Ratings and reviews | Early Sprint 5 | User/listing identities and agreed eligibility rules |
| System notifications | Early Sprint 5 | Defined events from messaging, listings, and moderation |
| Basic analytics and statistics | Early Sprint 5 | Defined metrics and collection of required event/view data |

Remaining feature work in Sprint 5 should finish before the main final test execution and demonstration rehearsal. Testing starts in earlier sprints and does not wait until PA5. Sprint targets will be updated in Jira and the Project Schedule when the team confirms its actual capacity.

### 4.8 Execution and Replanning Rules
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

- Conduct one Sprint Planning meeting, two Scrum meetings, and one Sprint Review per sprint; keep meeting records according to the separately supplied WeeklyReports guidance.
- Create Jira tasks before work begins. Assign one performer and a different reviewer, with due dates and acceptance criteria appropriate to the task.
- Keep the sprint plan, Detailed Sprint Tasks, Project Schedule, Build Plan, and Jira consistent.
- Use the Spec Kit workflow for feature specifications, plans, task breakdown, and implementation; retain generated artifacts.
- Treat a functional group as complete only when its relevant UI, backend logic, and persistence are integrated and verified. Database tables or backend scaffolding alone do not constitute completion.
- Review code and documents, record verification results, and maintain AI usage logs and Git history throughout each sprint.
- Reassess workload and dependencies during each Scrum meeting. If scope or estimates become infeasible, discuss adjustments with the team, update the affected documents and Jira, and obtain course feedback where necessary.
- Revise this plan in PA3 using TA feedback and actual progress. Future sprint content is a forecast until confirmed during the corresponding Sprint Planning meeting.

## 5. Detailed Sprint Tasks
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

### 5.1 Planning Basis
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

All PA2 task-table dates use MM-DD in 2026. Work Due is the performer deadline; Review Due is a separate review deadline. These dates are the baseline commitments, not actual completion dates.

The five member IDs in this section are TV1 – Đặng Hiển, TV2 – Nguyễn Hữu Nghĩa, TV3 – Đỗ Quốc Đại, TV4 – Từ Thái Hưng, and TV5 – Võ Minh Khang. Primary technical roles describe continuing project responsibilities; the PA2 writing assignments distribute documentation work among all members.

### 5.2 Sprint 2 - PA2 Detailed Tasks
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

#### 5.2.1 Đặng Hiển
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Jira / Task ID | Task and Expected Work | Performer | Reviewer | Work Due | Review Due |
|---|---|---|---|---|---|
| SCRUM-24 / P1 | Write Project Plan Introduction: Introduce Roomify, its purpose and project context. | TV1 | TV2 | 10-15 | 10-16 |
| SCRUM-25 / P2 | Project Overview – Goals & Scope: Define project goals, in-scope and out-of-scope functionality. | TV1 | TV2 | 10-16 | 10-17 |
| SCRUM-26 / P3 | Project Overview – Deliverables & Assumptions: List deliverables and implementation assumptions. | TV1 | TV2 | 10-16 | 10-17 |
| SCRUM-27 / P4 | Build Five-Sprint Plan: Plan Sprint 1–5 for PA1–PA5, each estimated at 2–3 weeks. | TV1 | TV2 | 10-18 | 10-19 |
| SCRUM-28 / P5 | Write Detailed Sprint Tasks: Define tasks, performers, reviewers and deadlines for Sprint 2 and next Sprint; forecast later Sprints. | TV1 | TV2 | 10-19 | 10-20 |
| SCRUM-29 / P6 | Prepare Project Schedule: Document milestones, timelines and coordinate Jira consistency with TV2. | TV1 | TV2 | 10-20 | 10-21 |
| SCRUM-30 / P7 | Prepare Build Plan: Outline multiple testable builds, build schedule, testing goals, and PA5 demo readiness. | TV1 | TV2 | 10-20 | 10-21 |
| SCRUM-31 / P8 | Integrate Project Plan: Merge TV2 Project Organization and Risk Management; validate consistency. | TV1 | TV2 | 10-21 | 10-22 |
| SCRUM-32 / P9 | Finalize Project Plan After Review: Apply TV2 feedback and complete ProjectPlan.md. | TV1 | TV2 | 10-23 | 10-23 |

#### 5.2.2 Nguyễn Hữu Nghĩa
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Jira / Task ID | Task and Expected Work | Performer | Reviewer | Work Due | Review Due |
|---|---|---|---|---|---|
| SCRUM-33 / O1 | Write Team Structure & Roles: Describe team organization, responsibilities and roles. | TV2 | TV3 | 10-15 | 10-16 |
| SCRUM-34 / O2 | Write Risk Management: Analyze at least three risks including impact and mitigation. | TV2 | TV3 | 10-17 | 10-18 |
| SCRUM-35 / O3 | Create and Assign PA2 Jira Tasks: Create PA2 tasks across the P/O/V/F/Q deliverable groups and individual G participation tasks, with assignees, reviewers and deadlines. | TV2 | TV3 | 10-15 | 10-16 |
| SCRUM-36 / O4 | Align Jira with Sprint Plan: Update tasks from TV1 sprint plan and audit deadlines and statuses. | TV2 | TV3 | 10-19 | 10-20 |
| SCRUM-37 / O5 | Initialize Spec Kit: Initialize Spec Kit inside Roomify GitHub repository with artifacts under /src. | TV2 | TV3 | 10-17 | 10-18 |
| SCRUM-38 / O6 | Complete Spec Kit Constitution and Artifacts: Review constitution.md and generated Markdown artifacts. | TV2 | TV3 | 10-19 | 10-20 |
| SCRUM-39 / O7 | Coordinate Spec Kit Training: Guide all 5 members using official training video. | TV2 | TV3 | 10-16 | 10-17 |
| SCRUM-40 / O8 | Collect Spec Kit Training Evidence: Collect evidence from all five teammates. | TV2 | TV3 | 10-21 | 10-22 |
| SCRUM-41 / O9 | Collect Jira Evidence: Capture assignments deadlines and progress and hand screenshots to TV5. | TV2 | TV3 | 10-22 | 10-23 |
| SCRUM-42 / O10 | Collect Git Log Evidence: Export or capture repository commit history. | TV2 | TV3 | 10-23 | 10-23 |

#### 5.2.3 Đỗ Quốc Đại
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Jira / Task ID | Task and Expected Work | Performer | Reviewer | Work Due | Review Due |
|---|---|---|---|---|---|
| SCRUM-43 / V1 | Write Vision Introduction and References: State document purpose and cite references. | TV3 | TV4 | 10-15 | 10-16 |
| SCRUM-44 / V2 | Create Problem Statement: Use The problem of / Affects / The impact of which is / A successful solution would be table. | TV3 | TV4 | 10-16 | 10-17 |
| SCRUM-45 / V3 | Create Product Position Statement: Use For / Who / The product name / That / Unlike / Our product table. | TV3 | TV4 | 10-17 | 10-18 |
| SCRUM-46 / V4 | Write Stakeholder Summary: Identify stakeholders, interests, responsibilities and roles. | TV3 | TV4 | 10-18 | 10-19 |
| SCRUM-47 / V5 | Write User Summary and Environment: Describe users and use environments. | TV3 | TV4 | 10-18 | 10-19 |
| SCRUM-48 / V6 | Document Stakeholder and User Needs: List important needs and how Roomify addresses them. | TV3 | TV4 | 10-19 | 10-20 |
| SCRUM-49 / V7 | Analyze Alternatives and Competition: Use PA1 similar application survey to compare alternatives. | TV3 | TV4 | 10-20 | 10-21 |
| SCRUM-50 / V8 | Reconcile PA1 Research: Cross-check PA1 findings and update materially changed assumptions. | TV3 | TV4 | 10-20 | 10-21 |
| SCRUM-51 / V9 | Consolidate Vision Analysis Sections: Combine introduction, positioning and stakeholders/users and hand off draft to TV5. | TV3 | TV4 | 10-21 | 10-22 |
| SCRUM-52 / V10 | Finalize Vision Analysis After Feedback: Revise and hand off reviewed sections. | TV3 | TV4 | 10-23 | 10-23 |

#### 5.2.4 Từ Thái Hưng
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Jira / Task ID | Task and Expected Work | Performer | Reviewer | Work Due | Review Due |
|---|---|---|---|---|---|
| SCRUM-53 / F1 | Confirm Product Feature Scope: Review PA1 Roomify features and lock scope. | TV4 | TV5 | 10-16 | 10-17 |
| SCRUM-54 / F2 | Write Product Perspective: Explain Roomify context and relationships with surrounding systems. | TV4 | TV5 | 10-17 | 10-18 |
| SCRUM-55 / F3 | Write Assumptions & Dependencies: Describe product assumptions and dependencies. | TV4 | TV5 | 10-17 | 10-18 |
| SCRUM-56 / F4 | Document Renter Features: Describe search filters room details and agreed renter capabilities. | TV4 | TV5 | 10-19 | 10-20 |
| SCRUM-57 / F5 | Document Landlord Features: Describe create and manage listings and agreed landlord capabilities. | TV4 | TV5 | 10-19 | 10-20 |
| SCRUM-58 / F6 | Document Shared Features: Describe authentication role selection messaging where in scope. | TV4 | TV5 | 10-20 | 10-21 |
| SCRUM-59 / F7 | Draw Renter Workflow Diagram: Create Mermaid renter journey from discovery to landlord contact. | TV4 | TV5 | 10-20 | 10-21 |
| SCRUM-60 / F8 | Draw Landlord Workflow Diagram: Create Mermaid landlord listing creation and management journey. | TV4 | TV5 | 10-20 | 10-21 |
| SCRUM-61 / F9 | Reconcile Features and Workflows: Check workflow against features and PA1; deliver draft to TV5. | TV4 | TV5 | 10-21 | 10-22 |
| SCRUM-62 / F10 | Finalize Product Features and Workflows: Revise based on review feedback. | TV4 | TV5 | 10-23 | 10-23 |

#### 5.2.5 Võ Minh Khang
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Jira / Task ID | Task and Expected Work | Performer | Reviewer | Work Due | Review Due |
|---|---|---|---|---|---|
| SCRUM-63 / Q1 | Identify Non-Functional Requirement Categories: Identify suitable Roomify NFR categories. | TV5 | TV1 | 10-16 | 10-17 |
| SCRUM-64 / Q2 | Define Performance Requirements: Set feasible response-time and concurrent-use measurable targets. | TV5 | TV1 | 10-18 | 10-19 |
| SCRUM-65 / Q3 | Define Security Requirements: Describe authentication authorization and basic data protection. | TV5 | TV1 | 10-18 | 10-19 |
| SCRUM-66 / Q4 | Define Platform Standards & Quality Attributes: Describe platforms compatibility usability and quality standards. | TV5 | TV1 | 10-19 | 10-20 |
| SCRUM-67 / Q5 | Review and Quantify NFRs: Make NFR testable and realistic for the team. | TV5 | TV1 | 10-20 | 10-21 |
| SCRUM-68 / Q6 | Create AI Usage Report Template: Prepare shared AI usage declaration and log template. | TV5 | TV1 | 10-15 | 10-16 |
| SCRUM-69 / Q7 | Create Weekly Report Template: Follow lecturer-provided WeeklyReports document format. | TV5 | TV1 | 10-16 | 10-17 |
| SCRUM-70 / Q8 | Compile AI Usage Report: Collect all member AI logs and prepare AI usage report. | TV5 | TV1 | 10-21 | 10-22 |
| SCRUM-71 / Q9 | Document Planning and Scrum Meeting Minutes: Collect actual Sprint Planning and Scrum meeting records. | TV5 | TV1 | 10-22 | 10-23 |
| SCRUM-72 / Q10 | Write Sprint Review Report: Record outcomes feedback and pending issues. | TV5 | TV1 | 10-22 | 10-23 |
| SCRUM-73 / Q11 | Integrate Jira Evidence: Insert Jira screenshots received from TV2 in reports. | TV5 | TV1 | 10-22 | 10-23 |
| SCRUM-74 / Q12 | Assemble Final Vision Document: Merge TV3 TV4 TV5 content; check Markdown PDF Mermaid and metadata. | TV5 | TV1 | 10-23 | 10-23 |
| SCRUM-75 / Q13 | Package and Submit PA2: Verify evidence and documents, prepare `PA2-Group13.zip`, coordinate submission. | TV5 | TV1 | 10-24 | 10-24 |

#### 5.2.6 Individual Participation and Evidence Tasks
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Jira | Individual Task | Performer | Evidence Reviewer under the Review Rotation | Work Due |
|---|---|---|---|---|
| SCRUM-85 | Attend Sprint Planning | TV1 | TV2 | 10-15 |
| SCRUM-86 | Attend Sprint Planning | TV2 | TV3 | 10-15 |
| SCRUM-87 | Attend Sprint Planning | TV3 | TV4 | 10-15 |
| SCRUM-88 | Attend Sprint Planning | TV4 | TV5 | 10-15 |
| SCRUM-89 | Attend Sprint Planning | TV5 | TV1 | 10-15 |
| SCRUM-90 | Complete Official Spec Kit Training | TV1 | TV2 | 10-20 |
| SCRUM-91 | Complete Official Spec Kit Training | TV2 | TV3 | 10-20 |
| SCRUM-92 | Complete Official Spec Kit Training | TV3 | TV4 | 10-20 |
| SCRUM-93 | Complete Official Spec Kit Training | TV4 | TV5 | 10-20 |
| SCRUM-94 | Complete Official Spec Kit Training | TV5 | TV1 | 10-20 |
| SCRUM-95 | Submit Training Evidence to TV2 | TV1 | TV2 | 10-21 |
| SCRUM-96 | Submit Training Evidence to TV2 | TV2 | TV3 | 10-21 |
| SCRUM-97 | Submit Training Evidence to TV2 | TV3 | TV4 | 10-21 |
| SCRUM-98 | Submit Training Evidence to TV2 | TV4 | TV5 | 10-21 |
| SCRUM-99 | Submit Training Evidence to TV2 | TV5 | TV1 | 10-21 |
| SCRUM-100 | Record and Submit AI Usage Log to TV5 | TV1 | TV2 | 10-21 |
| SCRUM-101 | Record and Submit AI Usage Log to TV5 | TV2 | TV3 | 10-21 |
| SCRUM-102 | Record and Submit AI Usage Log to TV5 | TV3 | TV4 | 10-21 |
| SCRUM-103 | Record and Submit AI Usage Log to TV5 | TV4 | TV5 | 10-21 |
| SCRUM-104 | Record and Submit AI Usage Log to TV5 | TV5 | TV1 | 10-21 |
| SCRUM-105 | Attend Scrum Meetings and Update Jira | TV1 | TV2 | 10-22 |
| SCRUM-106 | Attend Scrum Meetings and Update Jira | TV2 | TV3 | 10-22 |
| SCRUM-107 | Attend Scrum Meetings and Update Jira | TV3 | TV4 | 10-22 |
| SCRUM-108 | Attend Scrum Meetings and Update Jira | TV4 | TV5 | 10-22 |
| SCRUM-109 | Attend Scrum Meetings and Update Jira | TV5 | TV1 | 10-22 |
| SCRUM-110 | Commit Assigned Documentation to GitHub | TV1 | TV2 | 10-21 |
| SCRUM-111 | Commit Assigned Documentation to GitHub | TV2 | TV3 | 10-21 |
| SCRUM-112 | Commit Assigned Documentation to GitHub | TV3 | TV4 | 10-21 |
| SCRUM-113 | Commit Assigned Documentation to GitHub | TV4 | TV5 | 10-21 |
| SCRUM-114 | Commit Assigned Documentation to GitHub | TV5 | TV1 | 10-21 |
| SCRUM-115 | Complete Cross-Reviews | TV1 | TV2 | 10-23 |
| SCRUM-116 | Complete Cross-Reviews | TV2 | TV3 | 10-23 |
| SCRUM-117 | Complete Cross-Reviews | TV3 | TV4 | 10-23 |
| SCRUM-118 | Complete Cross-Reviews | TV4 | TV5 | 10-23 |
| SCRUM-119 | Complete Cross-Reviews | TV5 | TV1 | 10-23 |
| SCRUM-120 | Attend Sprint Review | TV1 | TV2 | 10-22 |
| SCRUM-121 | Attend Sprint Review | TV2 | TV3 | 10-22 |
| SCRUM-122 | Attend Sprint Review | TV3 | TV4 | 10-22 |
| SCRUM-123 | Attend Sprint Review | TV4 | TV5 | 10-22 |
| SCRUM-124 | Attend Sprint Review | TV5 | TV1 | 10-22 |
| SCRUM-125 | Revise and Confirm Final Deliverables | TV1 | TV2 | 10-23 |
| SCRUM-126 | Revise and Confirm Final Deliverables | TV2 | TV3 | 10-23 |
| SCRUM-127 | Revise and Confirm Final Deliverables | TV3 | TV4 | 10-23 |
| SCRUM-128 | Revise and Confirm Final Deliverables | TV4 | TV5 | 10-23 |
| SCRUM-129 | Revise and Confirm Final Deliverables | TV5 | TV1 | 10-23 |

### 5.3 Sprint 3 - PA3 Proposed Detailed Tasks
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

**Goal:** Revise Plan/Vision, specify and prototype the whole agreed scope, and implement at least one end-to-end functional group using Spec Kit. Authentication and listing management are the internal implementation targets from the Five-Sprint Plan.

**Scheduling assumption:** a proposed three-week Sprint 3, subject to the official course and Jira dates. D1 is the first calendar day of the agreed sprint; D21 is its last day. Deadlines below are relative planning targets, not official calendar deadlines.
| ID | Task / Required Output | Performer | Reviewer | Work Due | Review Due |
|---|---|---|---|---|---|
| S3-01 | Record Sprint Planning decisions; create and assign the agreed Jira backlog with acceptance criteria. | TV5 | TV2 | D1 | D2 |
| S3-02 | Revise Project Plan using available TA feedback and actual progress; record its changes in the shared Changes.md. | TV1 | TV2 | D3 | D4 |
| S3-03 | Revise Vision, reconcile the approved scope and NFRs, and record its changes in the same Changes.md. | TV3 | TV4 | D3 | D4 |
| S3-04 | Produce a complete use-case inventory and Mermaid diagrams covering all Vision functional requirements; allocate every use case to a specification/prototype batch. | TV2 | TV3 | D5 | D6 |
| S3-05 | Specify and prototype authentication/authorization and administrator moderation use cases, including all applicable alternative flows. | TV1 | TV2 | D8 | D9 |
| S3-06 | Specify and prototype landlord listing-management use cases, including applicable image, validation, availability, and moderation alternatives. | TV2 | TV3 | D8 | D9 |
| S3-07 | Specify and prototype map browsing, search/filtering, room details, and favorites use cases. | TV3 | TV4 | D8 | D9 |
| S3-08 | Specify and prototype messaging, ratings/reviews, and notifications use cases with their eligibility and failure flows. | TV4 | TV5 | D8 | D9 |
| S3-09 | Specify and prototype the AI assistant and analytics use cases, including no-match, invalid-input, access, and service-failure scenarios as applicable. | TV5 | TV1 | D8 | D9 |
| S3-10 | Prepare reviewed authentication feature specification, implementation plan, tasks, and generated verification artifacts through Spec Kit. | TV2 | TV1 | D10 | D11 |
| S3-11 | Implement authentication persistence, backend endpoints, validation, and role-based authorization according to the reviewed artifacts. | TV1 | TV2 | D13 | D14 |
| S3-12 | Implement authentication UI and connect it to the backend, including success and error states. | TV3 | TV4 | D13 | D14 |
| S3-13 | Verify the integrated authentication group across UI, API, and database; record defects, fixes, and verification evidence. | TV4 | TV5 | D15 | D16 |
| S3-14 | Prepare listing-management Spec Kit specification, plan, tasks, and generated verification artifacts. | TV2 | TV1 | D12 | D13 |
| S3-15 | Implement listing-management backend and required schema changes, including ownership checks and separate availability/moderation rules. | TV1 | TV2 | D17 | D18 |
| S3-16 | Implement listing creation/editing/detail UI, image interactions, and integration with backend validation. | TV3 | TV4 | D17 | D18 |
| S3-17 | Verify listing management end-to-end, report defects, and verify corrections; escalate scope or integration problems immediately. | TV4 | TV5 | D19 | D20 |
| S3-18 | Prepare permitted sample data, reproducible setup/configuration examples, and the narrated implementation demo video with YouTube link. | TV5 | TV1 | D20 | D21 |
| S3-19 | Audit all use cases against diagrams, specifications, basic/alternative-flow prototype screenshots, and scoped capabilities; resolve coverage gaps with the relevant authors. | TV2 | TV3 | D19 | D20 |
| S3-20 | Produce Planning, two Scrum, and Sprint Review reports with actual attendance, decisions, progress, and Jira evidence. | TV5 | TV2 | D20 | D21 |
| S3-21 | Compile truthful AI usage records, complete Git evidence, render required PDFs, check Changes.md, and package PA3-Group13.zip without dependencies/build outputs. | TV5 | TV1 | D21 | D21 |
| S3-X1 | Stretch: prepare reviewed Spec Kit artifacts and a basic map UI using permitted sample listings after required work is on track. | TV3 | TV1 | D19 | D20 |
| S3-X2 | Stretch: prepare reviewed Spec Kit artifacts and basic geographic/filter retrieval supporting the map prototype. | TV1 | TV2 | D19 | D20 |

### 5.4 Sprint 4 and Sprint 5 Forecast
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

Later-sprint tasks are forecasts. Detailed ownership and dates will be assigned when each sprint begins.
| Sprint | Planned Task Groups | Required Outcome |
|---|---|---|
| Sprint 4 - PA4 | Revise use cases and Changes.md; document actual stack, C4 Levels 1-3, and deployment; complete map/search; implement at least two additional end-to-end groups; progress favorites, moderation, messaging, and AI according to dependencies/capacity; retain generated tests, Spec Kit artifacts, videos, and reports. | Architecture matches implemented code, PA4 requirements are complete, and remaining feature work has an explicit schedule. |
| Sprint 5 - PA5 | Finish remaining agreed features early, including ratings/reviews, notifications, analytics, and explicitly carried-over work; review/refine generated tests; prepare and execute at least 50 functional cases across at least five use cases including AI; link failures to bugs and verify fixes; update all PA documents; complete reflections and final package; rehearse an all-member demo. | All scoped functional groups work together; verification and defect records are complete; final product, documents, artifacts, and demonstration are ready. |

### 5.5 Task Completion and Schedule Control
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa
1. Confirm proposed assignments and calendar dates before starting Sprint 3 work; create the corresponding Jira tasks and link relevant specifications.
2. Record one performer, a different reviewer, work/review deadlines, dependencies, and acceptance criteria for each task.
3. Keep creation/assignment/completion evidence truthful; planned due dates are not actual completion dates.
4. Complete the required output, perform appropriate verification, commit or attach evidence, and address review feedback before marking work Done.
5. Maintain Markdown/PDF documents and Mermaid diagrams with accurate section metadata.
6. Compare this task plan with the Five-Sprint Plan, Project Schedule, Build Plan, and Jira after review or significant changes.
7. Reserve integration, correction, packaging, and review capacity rather than allocating all available time to new features.

## 6. Project Schedule
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

### 6.1 Scheduling Basis
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

The project is organized into five logical sprints corresponding to PA1-PA5. Each sprint is normally estimated at two to three weeks.

All calendar dates below use Vietnam time. Work and review deadlines are planning commitments, not evidence that a task or review has been completed. 

Only PA2 has a confirmed calendar baseline in this schedule. For Sprint 3, D1 means its agreed first calendar day and D21 its proposed last day. Sprints 4 and 5 also use a proposed three-week envelope, subject to course deadlines and Sprint Planning. 

### 6.2 Five-Sprint Milestones
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Sprint / Milestone | Period | Planned Outcome and Exit Evidence | Coordination |
|---|---|---|---|
| Sprint 1 / M1: PA1 baseline | Historical; exact course dates to be confirmed | Product proposal, application survey, Team Contract, repository and tool evidence. Completion is reported by the team; the schedule does not certify submission. | TV5 coordinates; all members contribute. |
| Sprint 2 / M2: PA2 planning baseline | 10-24 October 2026 | Project Plan and Vision in Markdown/PDF; Spec Kit initialization and training evidence; AI usage, meeting, Jira and Git records; PA2 package. | TV1 integrates Project Plan; TV2 coordinates tools/evidence; TV5 integrates Vision and packaging. |
| Sprint 3 / M3: PA3 initial implementation | Proposed D1-D21; calendar dates pending | Revised Plan/Vision and Changes.md; complete use-case specifications and prototypes; at least one verified end-to-end functional group; artifacts, reports and narrated demo. Authentication and listing management are the internal target. | Proposed task owners and reviewers are in Section 5.3. |
| Sprint 4 / M4: PA4 integrated workflows | Forecast D1-D21; calendar dates pending | Architecture matching the implementation, revised specifications, at least two additional end-to-end functional groups, generated tests and demo evidence. | TV5 coordinates; detailed performers/reviewers are assigned in Sprint Planning. |
| Sprint 5 / M5: PA5 final delivery | Forecast D1-D21; calendar dates pending | Agreed scope complete, reviewed and executed test suite, linked defect/fix records, final documents, reflections, source/artifacts and all-member demonstration. | TV5 coordinates; TV4 leads testing, TV1/TV3 support integration, TV2 maintains documentation. |

### 6.3 PA2 Calendar and Handoffs
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Date | Planned Milestone / Handoff | Primary Coordination | Jira / Acceptance Evidence |
|---|---|---|---|
| 10 October | Sprint Planning and initial task allocation; begin document sections and report templates. | TV5 with all members; TV2 maintains Jira. | P1, O1/O3, V1, Q6 and individual G1 records. |
| 17 October | Scope/overview and initial organization, positioning, dependencies and Spec Kit setup available. | Section performers; their assigned reviewers. | P2-P3, O1-O2/O5, V2-V3 and F1-F3; reviewed source/artifacts. |
| 19 October | Five-sprint/task plan and Jira alignment checkpoint; first Scrum meeting. | TV1 for P4-P5; TV2 for O4/O6; TV5 for meeting coordination. | SCRUM-27/28/36/38 and actual meeting record. |
| 20 October | Schedule/build-plan drafts and major Vision feature/workflow/NFR sections due; individual training due. | TV1 for P6-P7; TV3-TV5 for their sections; all members for training. | SCRUM-29/30, relevant V/F/Q tasks and individual G2 evidence. |
| 21 October | Integrated Project Plan draft; Vision section drafts handed to TV5; training evidence and AI logs collected. | TV1 for P8; TV2 for training; TV5 for Vision/reports. | SCRUM-31/40/51/61/70; individual G3/G4/G6 outputs. |
| 22 October | Draft review, second Scrum meeting, Sprint Review and Jira-evidence checkpoint. | Assigned reviewers; TV2 for Jira evidence; TV5 for actual meeting records. | P8 review due; O9, Q9-Q11 and individual G5/G8 records. |
| 23 October | Apply feedback, finalize Plan/Vision and reports; check PDF/Markdown, metadata and Git evidence. | TV1 for P9; TV3-TV5 for final sections; TV2 for O10. | SCRUM-32/42/52/62/74; individual G7/G9. Same-day work/review requires an explicit handoff window. |
| 24 October | Assemble and verify PA2-Group13.zip; coordinate submission and retain the receipt. | TV5 performs Q13; TV1 reviews. | SCRUM-75; package contents and actual submission evidence. |

For same-day deadlines on 23 October, the proposed internal sequence is: authors hand off by 12:00, reviewers respond by 17:00, and authors resolve findings by 21:00. TV5 can then check the package before the 24 October submission. These times are coordination proposals, not a change to Jira due dates or a claim of team agreement. The actual course submission cutoff must be checked before uploading.

### 6.4 Future Sprint Checkpoints and Dependencies
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Sprint | Early Work | Integration and Verification | Review / Delivery Reserve |
|---|---|---|---|
| Sprint 3 | D1 planning; revised Plan/Vision by D3 and reviewed D4; use-case inventory D5/review D6; complete specifications/prototypes D8/review D9. | Authentication artifacts D10/review D11; implementation D13/review D14; verification D15/review D16. Listing artifacts D12/review D13; implementation D17/review D18; verification D19/review D20. | Coverage audit D19/review D20; narrated demo and reports D20/review D21; final package D21. Map/search work is stretch work only. |
| Sprint 4 | D1-D5: confirm additional functional groups and owners, revise use cases, and update architecture/API contracts. | D6-D15: complete and verify at least two additional groups relative to earlier completed work, prioritizing map browsing and search; progress favorites/moderation, then messaging/AI as dependencies permit. | D16-D18: integration and regression; D19-D21: corrections, architecture reconciliation, demo and package. Carryovers must have explicit early-Sprint-5 owners/dates. |
| Sprint 5 | D1-D7: complete every remaining agreed feature and carried-over item; prepare/review the final Test Plan and cases in parallel. | D8-D14: execute at least 50 functional cases across at least five use cases including AI correctness; record actual outcomes and link failures to bugs. | D15-D18: fixes and regression; D19-D20: final candidate and all-member rehearsal; D21: verify final package and delivery evidence. |

The key implementation dependency is authentication and role checks -> landlord listing management and persistent listing data -> map/search/details -> favorites, messaging, moderation, AI and reporting capabilities as specified. Listing availability and moderation status remain separate concepts. AI requires listing retrieval and agreed matching rules; notification work requires defined triggering events. Testing and documentation run throughout development.


## 7. Build Plan
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

### 7.1 Build Strategy and Ownership
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

Roomify will be delivered through nine planned checkpoints, B0-B8, so integration and verification happen before PA5. A build is a reproducible software snapshot associated with a commit, setup instructions, configuration examples, migration/seed steps and recorded verification results. Document completion or database scaffolding alone does not count as a working functional group. These checkpoints define planned outputs and acceptance gates. Actual build results are maintained in the build records.

TV1 leads backend/database integration, TV3 leads UI integration, TV2 maintains technical documentation and Spec Kit artifacts, TV4 leads verification and defect tracking, and TV5 coordinates delivery and demonstration. Every implementation task still has one performer and a different reviewer. Sprint 3 assignments follow Section 5.3; later assignments are forecasts until Sprint Planning confirms them. TV2 normally reviews TV1 outputs, TV3 reviews TV2 outputs, TV4 reviews TV3 outputs, TV5 reviews TV4 outputs, and TV1 reviews TV5 outputs; explicitly assigned task reviewers take precedence.

Build targets use the same relative-day convention as Section 6. No unconfirmed date or hosting service is treated as committed. Required assignment functional-group counts take priority over stretch targets. Features left unfinished at a checkpoint remain open in Jira and are not described as completed.

### 7.2 Incremental Builds and Test Goals
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

| Build | Target Checkpoint | Integrated Scope | Main Verification / Exit Evidence |
|---|---|---|---|
| B0 - Reproducible foundation | End of Sprint 2 / 24 October; internal readiness target | Runnable application foundation, environment-variable example, database setup/migrations and permitted sample data. Map/AI feasibility findings and initial Spec Kit artifacts are recorded. | A teammate follows README steps from a clean setup, starts available components and verifies database connectivity. Record blockers honestly; B0 is not evidence of a completed user feature or a new PA2 grading requirement. |
| B1 - Authentication | Sprint 3 D16, after S3-13 review | Registration/login, role-aware UI/API access, validation and persisted user data. | Verify valid/invalid input, duplicate identities, login failure, logout/session behavior and forbidden role access; restart and confirm persistence. Link results to S3-10/11/12/13 and their artifacts. |
| B2 - Listing management | Sprint 3 D20, after S3-17 review; package D21 | Authenticated landlord listing creation/editing, images and validation, listing details and availability controls. | Verify owner/non-owner actions, required fields, invalid price/location/image inputs, saved data after reload, and separate moderation/availability rules. Record demo and regression evidence; satisfy at least one complete group for PA3 even if the second internal target slips. |
| B3 - Room discovery | Sprint 4 D10 forecast | Map browsing, room details and agreed combined search/filter behavior over persistent listing data. | Compare map markers and result lists, check combined filters/boundary and no-match cases, verify details and visibility rules, and handle map-service failure. Decide how functional groups are counted from approved use cases. |
| B4 - Core workflow integration | Sprint 4 D15 forecast | Discovery integrated with favorites and administrator moderation; at least two additional groups complete relative to prior sprints. Messaging/AI may join only if verified. | Verify per-user favorites and access control, moderation transitions and search visibility, and regress authentication/listings. Architecture must match this build; attach generated tests/artifacts and narrated demo evidence for PA4. |
| B5 - Feature-complete candidate | Sprint 5 D7 forecast | Every agreed group, including messaging, grounded AI recommendations, ratings/reviews, notifications and basic analytics; includes named Sprint 4 carryovers. | Verify messaging participants/persistence, review eligibility/duplicates, event notifications and metric definitions. For AI, check match correctness against actual available listings, no-match/ambiguous input and service failure. Resolve scope gaps before final execution begins. |
| B6 - System test candidate | Sprint 5 D14 forecast | Stable integrated version for the full reviewed functional test suite and agreed NFR measurements. | Execute at least ten functional cases for each of at least five selected use cases, minimum fifty total, including AI correctness. Record test IDs, dates, actual results, pass/fail and linked bug IDs for every failure. Measure relevant NFRs in a documented environment. |
| B7 - Release candidate | Sprint 5 D18 forecast | Corrected version with regression evidence and updated deployment/setup documentation. | Re-test every relevant fix and impacted workflow; retain earlier failures and bug history. Resolve defects blocking required journeys. Any remaining limitation must be documented for team/reviewer disposition; it cannot silently satisfy a required feature. |
| B8 - Demonstration and final package | Sprint 5 D20 rehearsal; D21 delivery forecast | Final candidate, safe sample accounts/data, final documents, artifacts, test/bug records, reflections and presentation material. | Reproduce setup, rehearse all-member demo, verify links/permissions and package contents, and record final commit/build identifier. Use a real working AI demonstration where required; a service-outage fallback is supplementary evidence. |

If B1 is delayed, protect PA3's minimum end-to-end group before continuing to B2. If B3/B4 forecast work is delayed, identify the two groups required for PA4 and allocate owners and correction time. Carryovers move into Sprint 5 D1-D7; they cannot consume the entire final testing/rehearsal reserve. Re-estimate promptly if the available course sprint is shorter than the proposed three-week envelope.

### 7.3 Build Entry, Verification and Release Record
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

Before a feature build enters integration, its specification/plan/tasks must identify the expected behavior, role rules, data changes, acceptance criteria and verification approach. Review API contracts and versioned database migrations; prepare test data and configuration without committing credentials. Define eligibility rules for reviews and visibility rules for listings before writing pass/fail expectations.

For each build:

1. Integrate reviewed changes on the agreed branch and identify the exact commit used.
2. Run documented setup and migration/seed steps; record environment and external-service configuration.
3. Run appropriate component/API checks and end-to-end checks across UI, backend and persistence, including error/access cases.
4. Execute a regression set for previously delivered journeys. Review AI-generated tests before using their results.
5. Record defects with reproduction steps, expected/actual behavior, severity and status; link failed tests and verification of fixes.
6. Have a different member verify the acceptance evidence; record actual dates and any outstanding limitations before labeling the build ready.

Each record contains: Build ID, target milestone, actual build date, commit/tag, included functional groups and Jira IDs, environment/setup, migration version, reviewer, test run references, pass/fail summary, known defects and release decision. Planned dates never substitute for execution dates. Preserve a last verified commit and a database backup before migrations/releases; rehearse restore on test data when a change puts demo data at risk.

### 7.4 Final Test Coverage and PA5 Demonstration
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

The proposed minimum final functional suite allocates ten cases each to authentication/role access, listing management, room discovery/search, messaging and the AI assistant: fifty cases across five selected use cases. TV4 must select concrete use-case IDs from the approved model before execution; where a listed area spans multiple use cases, choose at least five explicit IDs and provide at least ten cases per selected ID. Add cases for favorites, moderation, reviews, notifications and analytics as needed; the minimum does not exclude other scoped features from verification. Include positive, negative, role-access, boundary, no-data and applicable service-failure cases. Final expected results must match the approved specifications and NFRs.

The proposed demonstration follows a reproducible journey: a landlord signs in and creates/updates a listing; an administrator moderates it; a tenant uses map/search to find it, inspects details, saves it and contacts the landlord. Demonstrate the AI assistant with listing-based matching and no-match behavior, then show reviews, notifications and basic analytics under their agreed rules. Rehearse with prepared accounts and permitted sample data, and allocate a speaking/operation part to every member. Show the final build identifier and the corresponding test/bug records.

TV5 coordinates the rehearsal and package; TV4 checks demonstrated journeys; TV1/TV3 resolve integration issues; TV2 verifies setup, architecture and document consistency. Test external-service access before rehearsal. If an outage occurs, show a clear error state and explain the limitation; retain earlier recorded evidence as a supplement and restore the required working feature before acceptance.

### 7.5 Readiness Criteria
**Performed by:** Đặng Hiển | **Reviewed by:** Nguyễn Hữu Nghĩa | **Edited by:** Nguyễn Hữu Nghĩa

The final candidate is ready when all agreed functional groups are integrated, required flows pass the reviewed tests, no unresolved defect blocks a required demo journey, and each required failed test has a linked defect and re-test history. Test and bug records, actual architecture, source, Spec Kit artifacts, AI usage declarations, final course documents and setup instructions must refer to the same delivered version. The team must rehearse the all-member demonstration and verify final package contents before submission. Readiness is a recorded review decision, not an automatic consequence of reaching the planned date.

