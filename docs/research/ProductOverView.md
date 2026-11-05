# Product Overview

Performed by: Từ Thái Hưng 

Reviewed by: Võ Minh Khang 

Edited by: Võ Minh Khang

## 1. Product Perspective

Roomify is a standalone, web-based platform designed specifically for the room rental market. It acts as an interactive bridge connecting landlords with potential tenants. Unlike traditional listing sites, Roomify differentiates itself by placing an interactive map interface at the core of the user experience. The system integrates tightly with external mapping services (Google Maps API) for location visualization and utilizes a third-party AI service for its intelligent recommendation chatbot. The application uses a robust backend (Node.js/Express) and a scalable database (Supabase PostgreSQL) to ensure data consistency and real-time updates across multiple devices.

## 2. Assumptions and Dependencies

*   **Internet Connectivity:** The application assumes that users have a stable internet connection, as it is a web-based platform requiring real-time data fetching for map updates and messaging.
*   **Third-Party Services:** Roomify relies heavily on the availability and accuracy of the Google Maps API for its core interactive map functionality. Any downtime or policy changes from this service provider will directly impact the application.
*   **AI Service Availability:** The intelligent chatbot feature depends on a continuous and reliable connection to a cloud-based Large Language Model (LLM) API.
*   **Browser Compatibility:** The application assumes users are accessing the platform via modern, updated web browsers (e.g., Chrome, Edge, Safari) that support current web standards (React, HTML5, CSS3) for full functionality.