# Roomify

Roomify is a full-stack room-rental platform. For PA4, Group 13 implemented two end-to-end functional groups:

1. **Search and Filtering (002):** Public search and browsing of approved listings, with filters for keyword, administrative location, room type, price, area, and amenities.
2. **Listing Management (003):** Landlords can create, view, edit, and delete their listings, including selecting a location on a map. Editing a listing that requires review returns it to moderation.

Authentication and role-based access are part of the existing platform and protect listing-management operations.

## PA4 demo video

Add the final YouTube URL before submission:

- **Demo video:** `[PASTE YOUTUBE URL HERE]`

The narrated demo should cover both PA4 functional groups, including the search/filter flow and the landlord listing lifecycle.

## Technology

- **Frontend:** React 18, React Router, Vite, Leaflet
- **Backend:** Node.js, Express, Zod
- **Database:** PostgreSQL with PostGIS, hosted on Supabase
- **Maps and geocoding:** OpenStreetMap tiles and the Nominatim API
- **Verification:** Jest, Supertest, and Playwright

## Project structure

- `backend/` — REST API, database migrations, and backend tests
- `frontend/` — React application and browser-based end-to-end tests
- `shared/` — shared administrative-unit data used by search filters and listing-location display
- `src/specs/002-search-filtering/` — Search and Filtering Spec Kit artifacts
- `src/specs/003-listing-management/` — Listing Management Spec Kit artifacts
- `docs/analysis-and-design/` — project architecture and ERD documentation

The `shared/` directory is required by both the frontend and backend. Keep it in the source package.

## Run locally

Prerequisites: a supported Node.js version and a PostgreSQL/Supabase database configured for the backend.

Backend:

```powershell
cd backend
npm install
# Configure the required database and application environment variables locally.
npm run migrate
npm run dev
```

Frontend, in a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

The Vite development server runs at `http://localhost:5173` and proxies `/api/v1` requests to the backend at `http://127.0.0.1:3000` by default.

## PA4 source and documentation packaging

Include the complete application source, the Spec Kit artifacts for functional groups 002 and 003, and the required PA4 documents and evidence. Exclude dependency folders, generated build/cache files, local database artifacts, `.env` files, and any file containing credentials or other secrets. Use placeholders for configuration values in the submitted copy.

## Group

**Group 13.** See the PA4 reports and Jira evidence for member assignments and contributions.
