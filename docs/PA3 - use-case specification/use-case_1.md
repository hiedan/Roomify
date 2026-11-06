## UC-01: Register Account

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-01: Register Account

#### 1.1 Brief Description
This use case allows a Guest to create a new account in the Roomify system to become a Registered User. The Guest can register using a standard Email/Password or via third-party social accounts (Google, Facebook).

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins when the Guest chooses to register a new account.

1. The Guest clicks on the "Register" button.
2. The system displays the registration form requesting: Full Name, Email, Password, and Confirm Password.
3. The Guest enters valid information and clicks the "Đăng ký" (Submit) button.
4. The system validates the input format (e.g., matching passwords, valid email format).
5. The system verifies that the email does not already exist in the database.
6. The system creates a new user account, securely hashes the password, and saves the data.
7. The system redirects the user to the Login page. The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 2a. Register with Google
If at step 2 of the Basic Flow, the Guest clicks "Đăng ký bằng Google":
1. The system redirects to the Google OAuth page. 
2. Upon successful authentication, the system creates the account and logs them in. The use case ends.

##### 2.2.2 2b. Register with Facebook
If at step 2 of the Basic Flow, the Guest clicks "Đăng ký bằng Facebook":
1. The system redirects to the Facebook OAuth page. 
2. Upon successful authentication, the system creates the account and logs them in. The use case ends.

##### 2.2.3 4a. Missing or Invalid Input
If at step 4 of the Basic Flow, fields are blank or invalid:
1. The system displays an error message. 
2. The use case resumes at step 3 of the Basic Flow.

##### 2.2.4 4b. Passwords Do Not Match
If at step 4 of the Basic Flow, passwords do not match:
1. The system displays an error message. 
2. The use case resumes at step 3 of the Basic Flow.

##### 2.2.5 5a. Email Already Exists
If at step 5 of the Basic Flow, the email is already registered:
1. The system displays an error message. 
2. The use case resumes at step 3 of the Basic Flow.

### 3. Special Requirements

#### 3.1 Security Standard
- User passwords must be securely hashed. OAuth flows must comply with Google and Facebook security standards.

### 4. Preconditions

#### 4.1 Guest Status
- The Guest has opened the Roomify web application and is not currently logged in.

### 5. Postconditions

#### 5.1 Success Postcondition
- A new user account is successfully created.

#### 5.2 Failure Postcondition
- No user account is created, and the database remains unchanged.

### 6. Extension Points
- None.

### 7. UI Prototype

![UC-01 Registration Form Prototype](prototypes/uc01-register-prototype.jpg)  
*Figure UC-01: UI Prototype for Register Account*

---

## UC-02: Log In

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-02: Log In

#### 1.1 Brief Description
This use case allows a Guest to authenticate and access the Roomify system using their registered Email or via third-party social accounts (Google, Facebook).

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins when the Guest chooses to log in.

1. The Guest clicks on the "Log In" button on the navigation bar.
2. The system displays the login form.
3. The Guest enters their registered Email and Password, then clicks the "Đăng nhập" button.
4. The system validates the credentials against the database.
5. The system authenticates the user, establishes a secure session, and redirects them to the homepage. The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 3a. Log In with Google
If at step 3 of the Basic Flow, the Guest clicks "Đăng nhập bằng Google":
1. The system redirects to the Google OAuth page. 
2. Upon successful external authentication, the system logs the user in and redirects to the homepage. The use case ends.

##### 2.2.2 3b. Log In with Facebook
If at step 3 of the Basic Flow, the Guest clicks "Đăng nhập bằng Facebook":
1. The system redirects to the Facebook OAuth page. 
2. Upon successful external authentication, the system logs the user in and redirects to the homepage. The use case ends.

##### 2.2.3 4a. Invalid Credentials
If at step 4 of the Basic Flow, the input combination is incorrect:
1. The system displays an error message. 
2. The use case resumes at step 3 of the Basic Flow.

##### 2.2.4 3c. Missing Input
If at step 3 of the Basic Flow, the Guest leaves required fields blank:
1. The system prevents submission and highlights the fields. 
2. The use case resumes at step 3 of the Basic Flow.

### 3. Special Requirements

#### 3.1 Security Standard
* Passwords must be verified securely. OAuth flows must comply with Google and Facebook API security standards.

### 4. Preconditions

#### 4.1 Guest Status
* The Guest has opened the Roomify web application and is not logged in.

### 5. Postconditions

#### 5.1 Success Postcondition
* The Guest is successfully authenticated and transitions to a Registered User state.

#### 5.2 Failure Postcondition
* The Guest remains unauthenticated.

### 6. Extension Points

#### 6.1 Reset Password Decision
* At step 3 of the Basic Flow, if the Guest clicks "Quên mật khẩu?", **UC-03 (Reset Password)** is triggered.

### 7. UI Prototype

![UC-02 Log In Form Prototype](prototypes/uc02-login-prototype.png)  
*Figure UC-02: UI Prototype for Log In*

---

## UC-03: Reset Password

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-03: Reset Password

#### 1.1 Brief Description
This use case extends **UC-02 (Log In)** and allows a Guest who has forgotten their password to reset it by requesting a password reset link sent to their registered email.

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins at the *Reset Password Decision* extension point in **UC-02 (Log In)**.

1. The Guest clicks on the "Quên mật khẩu?" (Forgot Password) link.
2. The system displays the Reset Password form requesting the registered Email.
3. The Guest enters their Email and clicks the "Gửi liên kết" (Send Link) button.
4. The system validates that the Email exists in the database.
5. The system generates a time-limited reset token and sends it to the Guest's email.
6. The system displays a success message indicating the email has been sent. The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 4a. Email Not Found
If at step 4 of the Basic Flow, the entered email is not registered:
1. The system displays an error message. 
2. The use case resumes at step 3 of the Basic Flow.

##### 2.2.2 4b. Invalid Format
If at step 4 of the Basic Flow, the email format is invalid:
1. The system displays a validation error. 
2. The use case resumes at step 3 of the Basic Flow.

### 3. Special Requirements

#### 3.1 Token Expiration
* Reset tokens must be securely generated and expire after a short period (e.g., 15 minutes).

### 4. Preconditions

#### 4.1 Login Screen Active
* The Guest is on the Login page attempting to authenticate.

### 5. Postconditions

#### 5.1 Success Postcondition
* A password reset link is successfully sent to the user's email.

#### 5.2 Failure Postcondition
* No reset link is sent.

### 6. Extension Points
* None.

### 7. UI Prototype

![UC-03 Reset Password Prototype](prototypes/uc03-reset-password-prototype.png)  
*Figure UC-03: UI Prototype for Reset Password*

---

## UC-04: Log Out

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-04: Log Out

#### 1.1 Brief Description
This use case allows a logged-in user (Tenant, Landlord, Administrator) to securely end their active session in the Roomify system and return to the Guest state.

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins when the user decides to log out.

1. The user clicks on their profile avatar or account menu on the top navigation bar.
2. The system displays a dropdown menu with account options.
3. The user selects the "Log Out" (Đăng xuất) option.
4. The system terminates the active user session and clears all authentication tokens/cookies.
5. The system redirects the user to the public homepage (or Login page) and updates the UI to show Guest options (Register/Log In). The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 1a. Session Timeout
If the user is inactive for a specified period:
1. The system automatically terminates the session and logs the user out. 
2. The next time the user attempts to access a protected route, they are redirected to the Login page. The use case ends.

### 3. Special Requirements

#### 3.1 Security Standard
* All session data and tokens (e.g., JWT) must be securely destroyed or invalidated on both the client and server sides to prevent session hijacking.

### 4. Preconditions

#### 4.1 Authenticated User
* The user is currently authenticated and logged into the Roomify application.

### 5. Postconditions

#### 5.1 Success Postcondition
* The user's session is completely terminated and the user loses access to role-specific features.

#### 5.2 Failure Postcondition
* None.

### 6. Extension Points
* None.

### 7. UI Prototype

![UC-04 Log Out Prototype](prototypes/uc04-logout-prototype.png)  
*Figure UC-04: UI Prototype for Log Out*

---

## UC-05: Manage Profile

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-05: Manage Profile

#### 1.1 Brief Description
This use case allows a logged-in user (Tenant, Landlord, Admin) to view and update their personal profile information, such as their full name, phone number, and avatar.

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins when the user accesses their profile.

1. The user navigates to the "Trang cá nhân" (Profile) page from the navigation menu.
2. The system displays a form containing the user's current profile information (Avatar, Name, Email, Phone Number, and Role).
3. The user modifies their editable details (e.g., uploads a new avatar, updates their phone number) and clicks the "Lưu thay đổi" (Save Changes) button.
4. The system validates the input data (e.g., correct phone number format).
5. The system updates the profile data in the database.
6. The system displays a success notification and refreshes the displayed profile information. The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 4a. Invalid Input
If at step 4 of the Basic Flow, the provided data is invalid (e.g., phone number contains letters):
1. The system displays a validation error message next to the corresponding field. 
2. The use case resumes at step 3 of the Basic Flow.

##### 2.2.2 3a. Cancel Edit
If at step 3 of the Basic Flow, the user clicks "Hủy" (Cancel):
1. The system discards any unsaved changes and reloads the original profile data. The use case ends.

### 3. Special Requirements

#### 3.1 Field Restrictions
* The user's Email and Role are typically read-only and cannot be changed from this interface.

#### 3.2 Media Upload Limits
* Avatar image uploads must be restricted by file size and format (e.g., max 2MB, JPG/PNG only).

### 4. Preconditions

#### 4.1 Authenticated User
* The user is currently authenticated and logged into the Roomify system.

### 5. Postconditions

#### 5.1 Success Postcondition
* The user's profile information is successfully updated in the database and reflected across the UI.

#### 5.2 Failure Postcondition
* The user's profile information remains unchanged.

### 6. Extension Points
* None.

### 7. UI Prototype

![UC-05 Manage Profile Prototype](prototypes/uc05-manage-profile-prototype.png)  
*Figure UC-05: UI Prototype for Manage Profile*

---

## UC-06: Search Listings with Filters

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-06: Search Listings with Filters

#### 1.1 Brief Description
This use case allows a Guest to search for available boarding house listings using keywords and apply various filters (such as price range, location, and amenities) to narrow down the results.

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins when the Guest navigates to the search interface.

1. The Guest navigates to the Search page or uses the search bar on the homepage.
2. The Guest enters search keywords (e.g., street name, district) into the search bar.
3. The Guest selects specific filters in the filter panel (e.g., maximum price, property type, required amenities).
4. The Guest clicks the "Áp dụng" (Apply) button.
5. The system queries the database for approved listings that match all specified criteria.
6. The system displays a paginated list or grid of the matching listings. The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 5a. No Results Found
If at step 5 of the Basic Flow, no listings match the criteria:
1. The system displays a friendly message indicating no results were found and suggests adjusting or clearing the filters. 
2. The use case resumes at step 3 of the Basic Flow.

##### 2.2.2 3a. Clear Filters
If at step 3 of the Basic Flow, the Guest clicks a "Xóa bộ lọc" (Clear Filters) button:
1. The system resets all filters to their default state and displays all available approved listings. 
2. The use case resumes at step 6 of the Basic Flow.

### 3. Special Requirements

#### 3.1 Approved Listings Only
* Search results must only include listings that have been officially approved by an Admin.

### 4. Preconditions

#### 4.1 System Access
* The Guest has opened the Roomify web application.

### 5. Postconditions

#### 5.1 Success Postcondition
* The system displays a list of listings that perfectly match the user's search criteria.

#### 5.2 Failure Postcondition
* No search results are displayed due to system error.

### 6. Extension Points
* None.

### 7. UI Prototype

![UC-06 Search Listings Prototype](prototypes/uc06-search-listings-prototype_1.png)  
![UC-06 Search Listings Prototype](prototypes/uc06-search-listings-prototype_2.png)  
*Figure UC-06: UI Prototype for Search Listings with Filters*

---

## UC-07: View Listings on Map

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-07: View Listings on Map

#### 1.1 Brief Description
This use case allows a Guest to view available boarding house listings on an interactive map powered by Google Maps Platform. This provides a geographical overview of property locations and allows users to explore listings based on specific areas.

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins when the Guest switches to the Map view.

1. The Guest clicks the "Bản đồ" (Map view) toggle on the Search page.
2. The system requests the map rendering interface from the Google Maps Platform.
3. The system retrieves all approved listings and their geographical coordinates from the database.
4. The system displays the interactive map with markers (pins) representing the available listings.
5. The Guest clicks on a specific marker on the map.
6. The system displays a pop-up window (Info Window) over the marker, showing a brief summary of the listing (thumbnail, price, title).
7. The Guest clicks on the pop-up to view the full details of the listing.
8. The system triggers **UC-08 (View Listing Details)**. The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 2a. Google Maps API Failure
If at step 2 of the Basic Flow, the Google Maps Platform is unreachable or returns an error:
1. The system displays a fallback error message (e.g., "Không thể tải bản đồ lúc này") and suggests the user switch back to the List view. The use case ends.

##### 2.2.2 4a. Filter on Map
If at step 4 of the Basic Flow, the Guest applies filters via a floating filter panel:
1. The system dynamically updates the map markers to display only the listings that match the new criteria. 
2. The use case resumes at step 4 of the Basic Flow.

### 3. Special Requirements

#### 3.1 Performance
* If there are too many listings in a specific area, the system should use marker clustering to maintain performance and map readability.

#### 3.2 External API
* Requires a valid API Key and connection to the Google Maps Platform.

### 4. Preconditions

#### 4.1 System Access
* The Guest has opened the Roomify web application.

### 5. Postconditions

#### 5.1 Success Postcondition
* The Guest successfully views the spatial distribution of the listings on an interactive map.

#### 5.2 Failure Postcondition
* The map fails to load.

### 6. Extension Points
* None.

### 7. UI Prototype

![UC-07 View Listings on Map Prototype](prototypes/uc07-view-map-prototype.png)  
*Figure UC-07: UI Prototype for View Listings on Map*

---

## UC-08: View Listing Details

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-08: View Listing Details

#### 1.1 Brief Description
This use case allows a Guest to view the complete details of a specific boarding house listing, including an image gallery, detailed description, amenities, and automatically retrieved nearby places (e.g., schools, stores).

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins when the Guest selects a listing to view.

1. The Guest clicks on a listing card (from **UC-06**) or a map info pop-up (from **UC-07**).
2. The system retrieves the full details of the selected listing from the database, including pre-calculated nearby geographic information.
3. The system displays the Listing Details page, showing the image gallery, title, price, address, description, amenities, and nearby places.
4. The Guest scrolls through the page to review the provided information. The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 2a. Listing Unavailable
If at step 2 of the Basic Flow, the listing has been deleted, hidden, or is no longer approved:
1. The system displays an error message ("Phòng trọ không tồn tại hoặc đã bị gỡ") and provides a button to return to the Search page. The use case ends.

### 3. Special Requirements

#### 3.1 Data Retrieval Efficiency
* Nearby places (schools, convenience stores) should load quickly from the database, as they are populated during the Admin approval phase (**UC-21**).

### 4. Preconditions

#### 4.1 Active Browsing
* The Guest is browsing the Search Listings page or the Map view.

### 5. Postconditions

#### 5.1 Success Postcondition
* The Guest is successfully presented with all public details of the selected listing.

#### 5.2 Failure Postcondition
* The listing details are not displayed.

### 6. Extension Points

#### 6.1 View Contact Information
* At step 4 of the Basic Flow, if the Guest clicks the "Xem thông tin liên hệ" (View Contact) button, **UC-09 (View Landlord Contact Information)** is triggered.

### 7. UI Prototype

![UC-08 View Listing Details Prototype](prototypes/uc08-view-listing-details-prototype_1.png)  
![UC-08 View Listing Details Prototype](prototypes/uc08-view-listing-details-prototype_2.png)  
*Figure UC-08: UI Prototype for View Listing Details*

---

## UC-09: View Landlord Contact Information

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-09: View Landlord Contact Information

#### 1.1 Brief Description
This use case extends **UC-08 (View Listing Details)** and allows an authenticated user to reveal and view the hidden contact details (such as phone number and Zalo link) of the landlord associated with a specific listing.

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins at the *View Contact Information* extension point in **UC-08**.

1. The user clicks the "Xem thông tin liên hệ" (View Contact Information) button on the landlord profile card.
2. The system verifies that the user is currently logged in (authenticated).
3. The system retrieves the landlord's private contact details from the database.
4. The system dynamically updates the UI to reveal the contact information (e.g., Phone number, Zalo, Email) in place of the button, or displays it in a modal popup. The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 2a. User Not Logged In (Guest)
If at step 2 of the Basic Flow, the system detects the user is a Guest:
1. The system displays a prompt stating "Vui lòng đăng nhập để xem thông tin liên hệ". 
2. The system provides links to Log In (**UC-02**) or Register (**UC-01**). 
3. Once the user successfully logs in, they are redirected back to the Listing Details page. The use case ends.

##### 2.2.2 3a. Contact Info Unavailable
If at step 3 of the Basic Flow, the landlord has not provided a specific contact method (e.g., no Zalo link):
1. The system only displays the available methods (e.g., just the phone number). The use case ends.

### 3. Special Requirements

#### 3.1 Privacy & Security
* Contact information must never be included in the initial API payload for Guests. It must only be fetched securely via an authenticated API request.

### 4. Preconditions

#### 4.1 Listing Page Active
* The user is viewing a specific Listing Details page (**UC-08**).

### 5. Postconditions

#### 5.1 Success Postcondition
* The user successfully views the landlord's contact information.

#### 5.2 Failure Postcondition
* The contact information remains hidden.

### 6. Extension Points
* None.

### 7. UI Prototype

![UC-09 View Landlord Contact Prototype](prototypes/uc09-view-contact-prototype.png)  
*Figure UC-09: UI Prototype for View Landlord Contact Information*

---

## UC-10: Manage Favorite Listings

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-10: Manage Favorite Listings

#### 1.1 Brief Description
This use case allows a logged-in Tenant to save specific boarding house listings to a personal "Favorites" list for later review and comparison. Tenants can also remove listings from this list.

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins when the Tenant decides to save a listing or view their saved listings.

1. The Tenant browses listings on the Search page (**UC-06**) or views a specific Listing Details page (**UC-08**).
2. The Tenant clicks the "Trái tim" (Heart / Save) icon on a listing.
3. The system saves the listing ID to the Tenant's favorites list in the database.
4. The system updates the UI, changing the Heart icon to a filled/active state (e.g., solid red or blue) and displays a quick success toast notification.
5. The Tenant navigates to the "Phòng đã lưu" (Saved/Favorite Listings) page via the user dropdown menu.
6. The system retrieves and displays a grid of all listings the Tenant has saved. The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 2a. Remove from Favorites
If at step 2 of the Basic Flow, the Tenant clicks an already filled Heart icon:
1. The system removes the listing from their favorites list and changes the icon back to an empty state. 
2. If done from the "Saved Listings" page, the listing card disappears from the grid after a refresh. The use case ends.

##### 2.2.2 6a. Empty Favorites List
If at step 6 of the Basic Flow, the Tenant has not saved any listings:
1. The system displays a friendly empty state message (e.g., "Bạn chưa lưu phòng trọ nào") with a button to "Khám phá phòng trọ". The use case ends.

### 3. Special Requirements

#### 3.1 Availability Synchronization
* If a saved listing is subsequently deleted by the Landlord or rejected by the Admin, it should be marked as "Không còn khả dụng" (Unavailable) or automatically removed from the Tenant's favorites list.

### 4. Preconditions

#### 4.1 Authenticated Tenant
* The user is authenticated and logged into the Roomify system with the "Tenant" role.

### 5. Postconditions

#### 5.1 Success Postcondition
* The Tenant's favorites list is successfully updated and persistent across sessions.

#### 5.2 Failure Postcondition
* The favorites list remains unchanged.

### 6. Extension Points
* None.

### 7. UI Prototype

![UC-10 Manage Favorite Listings Prototype](prototypes/uc10-favorite-listings-prototype.png)  
*Figure UC-10: UI Prototype for Manage Favorite Listings*

---

## UC-11: Chat with AI Assistant

*Performed by: Từ Thái Hưng | Reviewed by: Võ Minh Khang | Edited by: Từ Thái Hưng*

### 1. Use-Case Name – UC-11: Chat with AI Assistant

#### 1.1 Brief Description
This use case allows a Guest to interact with an AI-powered chatbot (via an external LLM Service) to ask questions regarding boarding house rentals, get platform navigation help, and receive instant, natural-language support.

### 2. Flow of Events

#### 2.1 Basic Flow
This use case begins when the Guest accesses the AI chat widget.

1. The Guest clicks the AI floating chat widget icon located at the bottom right of the screen.
2. The system expands the widget into a chat window and displays a welcome message.
3. The Guest types a question (e.g., "Làm sao để tìm phòng giá rẻ ở Thủ Đức?") into the input field and clicks the Send button.
4. The system displays the Guest's message in the chat window.
5. The system sends the user's prompt securely to the external LLM Service.
6. The LLM Service processes the prompt and returns a generated text response.
7. The system displays the AI's response in the chat window. The use case ends.

#### 2.2 Alternative Flows

##### 2.2.1 6a. LLM Service Timeout/Error
If at step 6 of the Basic Flow, the LLM Service fails to respond within a specific timeframe or returns an error:
1. The system displays a fallback message in the chat window (e.g., "Xin lỗi, trợ lý AI hiện đang bận. Vui lòng thử lại sau.") and logs the error. The use case ends.

##### 2.2.2 3a. Empty Input
If at step 3 of the Basic Flow, the Guest attempts to send an empty message:
1. The system disables the send button or ignores the action. 
2. The use case resumes at step 3 of the Basic Flow.

### 3. Special Requirements

#### 3.1 Latency
* The system should display a "typing..." indicator while waiting for the LLM Service's response to improve UX.

### 4. Preconditions

#### 4.1 System and Service Availability
* The Guest has opened the Roomify web application.
* The LLM Service (e.g., Gemini or Claude API) is operational.

### 5. Postconditions

#### 5.1 Success Postcondition
* The Guest receives a helpful, context-aware answer from the AI assistant, and chat history is maintained for the duration of the current session.

#### 5.2 Failure Postcondition
* The system displays an error message, but the chat history remains.

### 6. Extension Points

#### 6.1 Recommendation Request
* If the Guest expresses a specific intent to find or compare boarding houses, **UC-12 (Get Listing Recommendations)** is triggered.

### 7. UI Prototype

![UC-11 Chat with AI Assistant Prototype](prototypes/uc11-ai-chat-prototype.png)  
*Figure UC-11: UI Prototype for Chat with AI Assistant*