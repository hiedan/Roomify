# Roomify Software Architecture

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa  

**Project:** Roomify — Map-Based Room Rental Platform  
**Course:** CS300 / CSC13002 — Introduction to Software Engineering  
**Group:** 13  
**Assignment:** PA4-2026  
**Document status:** Draft based on the repository implementation inspected on 2026-11-11. Update this document as PA4 features and deployment decisions are confirmed.

## 1. Technology Stack

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa  

The following technologies are evidenced by the current source code and dependency manifests.

| Area | Technology | Responsibility and evidence |
|---|---|---|
| Web frontend | React 18, JavaScript, Vite 5 | Renders the Roomify user interface. Vite serves the development application on port `5173` and proxies `/api/v1` requests to the backend during local development. |
| Client-side routing | React Router 6 | Provides navigation between the frontend pages and protected role-based routes. |
| Backend API | Node.js, Express 4, JavaScript | Provides the JSON REST API under `/api/v1`, including authentication, administrator, listing, and landlord-request routes. |
| Input validation | Zod | Validates backend request data where defined by the services. |
| Database access | PostgreSQL with `pg` | The backend uses a PostgreSQL connection pool and parameterized queries. Database migrations are managed with `node-pg-migrate`. |
| Managed database service | Supabase PostgreSQL | The backend configuration validates Supabase Direct or Session Pooler connection URLs and uses verified TLS. Runtime and test projects are configured separately. |
| Authentication | JSON Web Tokens (`jsonwebtoken`) and `bcryptjs` | The API issues and validates JWTs; passwords are hashed and verified with bcrypt. Authentication is implemented in the Roomify backend rather than delegated to an external identity provider. |
| Backend verification | Jest and Supertest | Runs backend unit and API integration tests. |
| Frontend end-to-end verification | Playwright | Runs the configured browser-based end-to-end tests. |

### 1.1 Communication and Configuration

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa  

- The browser frontend sends JSON HTTP requests to the backend under `/api/v1`. Authentication requests use bearer tokens where required.
- During local development, Vite proxies `/api/v1` to the backend at `http://127.0.0.1:3000`. This is a development configuration, not a production hosting decision.
- The backend connects to Supabase PostgreSQL over TLS on port `5432`, using either the Direct endpoint or Session Pooler. Production hosting for the web frontend and API has not been confirmed in the inspected repository.
- Database and token secrets are supplied through environment configuration. Environment files containing real credentials must not be committed or included in the submission package.

## 2. C4 Level 1 — System Context

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa  

### 2.1 Diagram

```mermaid
flowchart LR
    Visitor["Visitor<br/>Registers or signs in"]
    Tenant["Tenant<br/>Uses rental-room features"]
    Landlord["Landlord<br/>Manages rental listings"]
    Admin["Administrator<br/>Manages accounts and reviews landlord requests"]

    subgraph Roomify["Roomify — Map-Based Room Rental Platform"]
        System["Roomify Web Application<br/>React frontend and Express REST API<br/>User authentication, role-based access,<br/>listing and landlord-request workflows"]
    end

    Supabase[("Supabase PostgreSQL<br/>Managed relational database")]

    Visitor -->|"Uses web interface; registration and login"| System
    Tenant -->|"Uses web interface and authenticated API"| System
    Landlord -->|"Uses web interface and authenticated API"| System
    Admin -->|"Uses administrative web interface and protected API"| System
    System <-->|"PostgreSQL read/write over verified TLS"| Supabase
```

### 2.2 System and Actor Descriptions

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa  

| Element | Description |
|---|---|
| Roomify | The software system presented to users through a React web application and an Express REST API. The current source includes account registration and login, JWT-protected access, role-aware administration, listing-related routes, and landlord access-request workflows. |
| Visitor | A person who is not signed in. Visitors use the web interface to register or log in. |
| Tenant | A signed-in user with the tenant role. Tenants use Roomify's tenant-facing functionality and can submit a request to become a landlord. |
| Landlord | A signed-in user with the landlord role. Landlords use Roomify's landlord-facing listing functionality. Access to protected listing operations is checked by the backend. |
| Administrator | A signed-in user with the administrator role. Administrators can use protected account-management and landlord-request review operations. |
| Supabase PostgreSQL | An externally managed database service. The Roomify backend reads and writes persistent application data through PostgreSQL connections protected by verified TLS. |

### 2.3 Diagram Notes and Scope

**Performed by:** Nguyễn Hữu Nghĩa | **Reviewed by:** Đỗ Quốc Đại | **Edited by:** Nguyễn Hữu Nghĩa  

- The Roomify boundary represents the software product as users experience it; the React frontend and Express API are intentionally shown as one system at C4 Level 1. They will be separated into containers in the Level 2 diagram.
- Supabase PostgreSQL is shown outside the Roomify software boundary because it is a separately managed service. The Level 2 diagram should show the database container and its managed hosting relationship consistently with this view.
- The roles and interactions above are based on the current frontend routes, backend API routes, and authorization middleware. A diagram does not imply that every planned product feature is already complete.
- No source-code evidence was found for an integrated external map provider, AI provider, OAuth/identity provider, email provider, or object-storage service. They are therefore not shown as current dependencies. Add them only after the team selects and implements them, and update the diagrams to match.
- Production hosting for the frontend and backend is not specified by the inspected configuration. Document the actual deployment nodes and protocols in the PA4 deployment section after the team confirms its hosting setup.

## 3. C4 Level 2 — Container Diagram

**Performed by:** Đỗ Quốc Đại | **Reviewed by:** Từ Thái Hưng | **Edited by:** Đỗ Quốc Đại

### 3.1 Container Diagram

**Performed by:** Đỗ Quốc Đại | **Reviewed by:** Từ Thái Hưng | **Edited by:** Đỗ Quốc Đại

```mermaid
flowchart TB
    Visitor["Visitor<br/>(Person)<br/>Unauthenticated user browsing public listings, registering, or signing in"]
    Tenant["Tenant<br/>(Person)<br/>Signed-in renter searching rooms and applying for landlord access"]
    Landlord["Landlord<br/>(Person)<br/>Signed-in property owner creating, editing, pinpointing, and deleting listings"]
    Admin["Administrator<br/>(Person)<br/>Signed-in moderator reviewing landlord requests and managing user accounts"]

    subgraph Roomify["Roomify — Map-Based Room Rental Platform (Software System)"]
        WebApp["Web Application SPA<br/>(Container: React 18, Vite 5, React Router 6, Leaflet 1.9)<br/>Renders role-based portals, public search, listing management UI, and interactive map picker"]
        ApiServer["Backend REST API Server<br/>(Container: Node.js, Express 4, Zod, JWT, bcryptjs, pg)<br/>Exposes /api/v1 REST endpoints, enforces RBAC and ownership, and executes DB transactions"]
    end

    SupabaseDB[("Supabase PostgreSQL + PostGIS<br/>(External Managed Database)<br/>Stores users, listings, images, room types, amenities, audits, and geography points")]
    OsmTiles["OpenStreetMap Tile Server<br/>(External Map Service)<br/>Serves raster map tiles for interactive map rendering"]
    NominatimApi["OpenStreetMap Nominatim API<br/>(External Geocoding Service)<br/>Provides address search and reverse geocoding"]

    Visitor -->|"Browses /search, /listings/:id, /login, /register<br/>(HTTPS / HTTP)"| WebApp
    Tenant -->|"Searches listings and submits landlord request<br/>(HTTPS / HTTP)"| WebApp
    Landlord -->|"Manages listings and picks map coordinates<br/>(HTTPS / HTTP)"| WebApp
    Admin -->|"Manages user roles/status and reviews requests<br/>(HTTPS / HTTP)"| WebApp

    WebApp <-->|"Calls /api/v1/* endpoints<br/>(HTTP/HTTPS, JSON REST + JWT Bearer)"| ApiServer
    WebApp -->|"Fetches map tiles<br/>(HTTPS, PNG images)"| OsmTiles
    WebApp <-->|"Queries address search and reverse geocoding<br/>(HTTPS, JSON)"| NominatimApi
    ApiServer <-->|"Reads and writes relational and spatial data<br/>(PostgreSQL wire protocol over verified TLS, port 5432)"| SupabaseDB
```

### 3.2 Container Descriptions

**Performed by:** Đỗ Quốc Đại | **Reviewed by:** Từ Thái Hưng | **Edited by:** Đỗ Quốc Đại

#### 3.2.1 Web Application (SPA)

**Performed by:** Đỗ Quốc Đại | **Reviewed by:** Từ Thái Hưng | **Edited by:** Đỗ Quốc Đại

- **Responsibility and Services Provided:**
  - Delivers the client-side Single Page Application running inside the user's browser across all implemented functional areas:
    - **Authentication and Role-Aware Session Management:** Registration (`/register`), login (`/login`), logout, JWT token persistence (`sessionStorage` / `localStorage`), cross-tab logout synchronization, and protected route guards (`ProtectedRoute`, `RoleRoute`) via `AuthContext`.
    - **Tenant and Landlord Access Requests:** Personal dashboard (`/dashboard`) and landlord application workflow (`/become-landlord`).
    - **Administrator Portal:** User lookup, role/status updates, and landlord request review queue (`/admin`).
    - **Public Listing Search and Details (FG1):** Multi-criteria filtering by keyword, district, room type, price, area, and amenities (`/search`), plus approved listing detail view (`/listings/:id`).
    - **Comprehensive Listing Management (FG2 — UC-13 to UC-17):** Landlord listing portfolio dashboard with moderation status tabs and summary counters (`/landlord/listings`), listing creation form (`/landlord/listings/create`), listing editor with automatic re-moderation notice (`/landlord/listings/:id/edit`), permanent deletion confirmation dialog (`DeleteListingModal`), and interactive map pinpointing (`MapLocationPicker`).
- **Technology / Framework Used:**
  - `react` (`^18.3.1`), `react-dom` (`^18.3.1`), `react-router-dom` (`^6.28.0`), `leaflet` (`^1.9.4`), and custom CSS (`styles.css`), bundled and served in development by `vite` (`^5.4.10`).
- **Communication with Other Containers & External Systems:**
  - **To Backend REST API Server:** Sends `fetch` HTTP/HTTPS requests carrying `application/json` payloads to `/api/v1/*` and includes `Authorization: Bearer <token>` headers for protected routes. Expects the standardized Roomify JSON response envelope (`{ success, data }` or `{ success, error }`).
  - **To OpenStreetMap Tile Server:** Directly requests raster tile images (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) via HTTPS from the browser when `MapLocationPicker` is opened.
  - **To OpenStreetMap Nominatim API:** Directly sends HTTPS `GET` requests to `/search` (forward address lookup) and `/reverse` (coordinate-to-address reverse geocoding) with JSON responses.

#### 3.2.2 Backend REST API Server

**Performed by:** Đỗ Quốc Đại | **Reviewed by:** Từ Thái Hưng | **Edited by:** Đỗ Quốc Đại

- **Responsibility and Services Provided:**
  - Acts as the central application server enforcing business logic, input validation, authentication, authorization, and transactional database persistence under `/api/v1`:
    - **Health & Authentication (`/api/v1/health`, `/api/v1/auth`):** Exposes `GET /api/v1/health` along with `/register`, `/login`, `/me`, and `/logout` under `/api/v1/auth`; hashes passwords using `bcryptjs` and issues/verifies HS256 JWT tokens.
    - **Access Control Middlewares:** Verifies live database account state (`requireAuth`), role permissions (`requireRole`, `requireAdmin`), and resource ownership (`requireOwnership`).
    - **Administration & Landlord Requests (`/api/v1/admin`, `/api/v1/landlord-requests`):** Handles user lookup, role/active-status updates with audit logging, and landlord request submission/review.
    - **Public Search & Listing Management (`/api/v1/listings`):** Exposes `GET /filters`, `GET /`, `POST /`, `GET /mine`, `GET /mine/:id`, `GET /:id`, `PATCH /:id`, and `DELETE /:id`. Enforces strict `camelCase` JSON validation via `zod` (`.strict()`), pessimistic row-level locking (`SELECT ... FOR UPDATE`), PostGIS spatial point construction (`ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`), transactional image/amenity updates, and automatic moderation reset to `pending` upon substantive listing edits.
- **Technology / Framework Used:**
  - Node.js (CommonJS), `express` (`^4.21.2`), `zod` (`^3.24.1`), `jsonwebtoken` (`^9.0.3`), `bcryptjs` (`^3.0.3`), and `pg` (`^8.13.1`), with `dotenv` (`^16.4.7`) for environment loading.
- **Communication with Other Containers & External Systems:**
  - **With Web Application (SPA):** Receives JSON REST requests over HTTP/HTTPS on port `3000` (configurable via `PORT`) and returns standardized JSON responses and HTTP status codes (`200`, `201`, `400`, `401`, `403`, `404`, `500`).
  - **With Supabase PostgreSQL + PostGIS:** Maintains a `pg` connection pool (`search_path=public,extensions`) connecting to Supabase Direct or Session Pooler endpoints on port `5432` over verified TLS (with optional custom CA certificate verification).

#### 3.2.3 External Managed and Third-Party Systems

**Performed by:** Đỗ Quốc Đại | **Reviewed by:** Từ Thái Hưng | **Edited by:** Đỗ Quốc Đại

| External System | Role in Container Architecture | Communication & Integration Notes |
|---|---|---|
| **Supabase PostgreSQL + PostGIS** | External managed relational and geospatial database storing `users`, `listings`, `listing_images`, `room_types`, `amenities`, `listing_amenities`, `nearby_places`, `favorites`, `landlord_requests`, and `admin_action_audits`. | Accessed exclusively by the Backend REST API Server over PostgreSQL wire protocol with verified TLS on port `5432`. Direct client-side Supabase Data API access is revoked (`1700000003000_supabase_backend_only.js`). |
| **OpenStreetMap Tile Server** | External public map tile CDN providing base map imagery inside `MapLocationPicker`. | Accessed directly by the Web Application SPA over HTTPS (`GET` PNG tiles); no API key is required or stored in the backend. |
| **OpenStreetMap Nominatim API** | External geocoding service used to search Vietnamese street/district queries and reverse-geocode dragged map pin coordinates. | Accessed directly by the Web Application SPA over HTTPS (`GET` JSON); includes client-side timeout and manual-input fallback so network latency never blocks listing submission. |

### 3.3 Consistency Notes with Level 1 & Source Code

**Performed by:** Đỗ Quốc Đại | **Reviewed by:** Từ Thái Hưng | **Edited by:** Đỗ Quốc Đại

1. **Refinement from Level 1:** The single `Roomify Web Application` system box in Section 2 (C4 Level 1) is decomposed here into two runtime containers: the browser-hosted **Web Application (SPA)** and the Node.js **Backend REST API Server**.
2. **Local Development Proxy vs. Logical Architecture:** In `frontend/vite.config.js`, Vite serves the SPA on `http://localhost:5173` and proxies `/api/v1` calls to `http://127.0.0.1:3000` to avoid CORS issues during local development. Logically, all business API traffic flows directly from the Web Application container to the Backend REST API container.
3. **Architecture Synchronization Note for Section 1 & Level 1:** Unlike the earlier draft note in Section 2.3 (inspected on `2026-11-11`), the current source code now includes `leaflet` (`^1.9.4`) integrating **OpenStreetMap Tile Server** and **OpenStreetMap Nominatim API** in `frontend/src/components/MapLocationPicker.jsx`, as well as PostGIS spatial storage in `backend/src/services/listingService.js`. Sections 1 and 2 should be updated accordingly before final PA4 submission so Level 1, Level 2, and Level 3 remain 100% consistent with the repository.

