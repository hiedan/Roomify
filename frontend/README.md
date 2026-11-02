# Frontend skeleton for Roomify Auth

This folder contains the initial frontend structure for the User Authentication and Role Management feature.

## Structure

- `src/pages` contains the main auth screens
- `src/context/AuthContext.jsx` manages auth state
- `src/api/authApi.js` prepares the API call layer to the backend
- `src/routes/ProtectedRoute.jsx` guards authenticated pages

## Run locally

```bash
npm install
npm run dev
```

This is a starter shell and is meant to be connected to the backend API once the auth endpoints are implemented.
