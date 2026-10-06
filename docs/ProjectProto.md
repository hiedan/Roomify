#  Project Proposal: Roomify
**Project Name:** Roomify - An Interactive Map-Based Room Rental Platform

## 1. Introduction 
 
Finding suitable accommodation is a critical and recurring challenge for students and working professionals in large cities. Currently, users often rely on fragmented Facebook groups or generic classified websites, which suffer from outdated, duplicate, or unverified information. Roomify aims to solve this by providing a highly visual, map-centric web application dedicated specifically to room rentals. By prioritizing an interactive map interface where available rooms appear dynamically as users explore different neighborhoods, Roomify significantly reduces the time and effort required to find the perfect home, while also helping landlords reach their target audience more effectively.

## 2. Target Users and Environments 


**Target Users:**
*  **Tenants (Students, Professionals):** Individuals looking for affordable and convenient places to live.
*  **Landlords:** Property owners or managers looking for a reliable platform to list their vacant rooms and manage tenant inquiries.
*  **Administrators:** Platform managers who moderate listings, resolve disputes, and ensure the system's integrity.

**Environments:** 
The application will be a responsive Web Application accessible via modern desktop browsers (Chrome, Edge, Safari) and optimized for mobile browsers, ensuring users can search for rooms on-the-go.

## 3. Key Features ⚙️
 

1.  **Interactive Map-Based Browsing**
   Upon logging in, users are greeted with an intuitive, dynamic map interface. As users drag, pan, or zoom the map across different areas, available rental properties dynamically appear as markers. This provides an immediate, visual understanding of location context, nearby amenities, and pricing distribution, making the search process far more engaging than scrolling through traditional lists.

2.  **User Authentication and Role Management**
   The platform supports secure registration and login using email and password, utilizing JWT for authentication. It distinguishes between distinct user roles—Tenants, Landlords, and Administrators—ensuring that each user type has access only to the functionalities and data relevant to their specific needs.

3.  **Comprehensive Listing Management**
   Landlords can easily create, edit, and manage their room listings by providing essential details such as title, description, price, address, and uploading high-quality images. The system allows landlords to update the availability status (e.g., vacant, rented, hidden) in real-time, ensuring that tenants only see active and available rooms.

4.  **Advanced Search and Filtering**
   Users can narrow down their options using a combination of keyword search and specific filters like price range, area size, and required amenities. This targeted search approach allows tenants to quickly eliminate unsuitable options and focus solely on properties that meet their exact living requirements.

5.  **Direct In-App Messaging**
   The application features a built-in communication system that allows tenants to contact landlords directly regarding a specific listing. This centralized messaging ensures that all rental inquiries and negotiations are kept organized within the platform, protecting user privacy by avoiding the need to share personal phone numbers immediately.

6.  **Favorites and Saved Listings**
   Tenants can bookmark properties they are interested in by adding them to a personal "Favorites" list. This allows users to keep track of multiple potential choices, easily compare them later, and make more informed decisions without having to search for the same properties repeatedly.

7.  **Rating and Review System**
   Tenants can leave star ratings and written reviews for rooms they have rented or visited. This feedback mechanism builds community trust, rewards good landlords with higher visibility, and helps future tenants avoid inaccurate listings or poor living conditions.

8.  **System Notifications**
   Users receive in-app notifications for important events, such as when a landlord replies to a message, a saved listing changes its price, or an administrator approves a new post. This keeps users informed and engaged, ensuring they do not miss out on time-sensitive rental opportunities.

9. **Admin Moderation Dashboard**
   Administrators have access to a dedicated dashboard to review new listings, approve or reject them based on quality guidelines, and manage user accounts. This crucial feature helps maintain a clean, spam-free environment and ensures compliance with community standards and legal regulations.

10. **Basic Analytics and Statistics**
    The platform provides basic statistical overviews, such as the total number of active listings, user registrations, and view counts for specific rooms. Landlords can use these insights to gauge the popularity of their listings and adjust pricing or descriptions accordingly.

## 4. AI-Powered Feature 
 

**Intelligent Room Recommendation Chatbot**
Roomify integrates a smart AI chatbot powered by a Large Language Model (LLM) to act as a virtual rental assistant. Instead of manually applying multiple filters, users can describe their ideal room in natural language (e.g., "I need a room near the University of Science under 3 million VND with parking"). The AI analyzes this natural language prompt, extracts key criteria (location, budget, amenities), and instantly queries the database to return the most relevant listings. Additionally, the chatbot can handle common frequently asked questions (FAQs) regarding rental policies and procedures, providing a seamless and highly personalized user experience.
