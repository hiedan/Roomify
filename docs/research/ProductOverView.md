# Product Overview

Performed by: Từ Thái Hưng 

Reviewed by: Võ Minh Khang 

Edited by: Võ Minh Khang

## 1. Product Perspective

Roomify is a web-based platform for the room-rental market that connects landlords with potential tenants. The implemented PA4 functionality includes public listing search and filtering, approved listing details, and landlord listing management. Search supports location, room type, price, area, and amenity filters. Landlords can select listing locations with a Leaflet map using OpenStreetMap tiles and the Nominatim geocoding service. The React frontend communicates with a Node.js/Express API, which persists application data in Supabase PostgreSQL with PostGIS support.

## 2. Assumptions and Dependencies

*   **Internet Connectivity:** The application requires internet access for API requests and map/geocoding services.
*   **Map and Geocoding Services:** The listing-location picker uses OpenStreetMap tiles and the Nominatim API. Map display and address lookup depend on the availability and usage policies of those services.
*   **AI Recommendations:** An AI-powered recommendation chatbot is a proposed product capability, not a dependency of the currently implemented PA4 functional groups.
*   **Browser Compatibility:** The application assumes users are accessing the platform via modern, updated web browsers (e.g., Chrome, Edge, Safari) that support current web standards (React, HTML5, CSS3) for full functionality.