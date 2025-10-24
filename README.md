 Moodle API Analysis & MCP Server Implementation Plan                    │
     │                                                                         │
     │ Key Findings                                                            │
     │                                                                         │
     │ Authentication System                                                   │
     │                                                                         │
     │ 1. Session-Based Auth (Web Browser):                                    │
     │   - Uses MoodleSession and MOODLEID1_ cookies                           │
     │   - Session key (sesskey) for CSRF protection                           │
     │ 2. Token-Based Auth (API):                                              │
     │   - Endpoint: POST /login/token.php                                     │
     │   - Parameters: username, password, service (e.g., "moodle_mobile_app") │
     │   - Returns: JSON with token for API calls                              │
     │                                                                         │
     │ API Endpoints Discovered                                                │
     │                                                                         │
     │ 1. REST API: /webservice/rest/server.php                                │
     │   - Format:                                                             │
     │ ?wstoken={token}&wsfunction={function}&moodlewsrestformat=json          │
     │ 2. AJAX API: /lib/ajax/service.php                                      │
     │   - Uses session authentication with sesskey parameter                  │
     │ 3. File Downloads:                                                      │
     │ /pluginfile.php/{contextid}/{component}/{filearea}/{itemid}/{filename}  │
     │   - Requires authentication (cookie or token)                           │
     │   - Accessed via /mod/resource/view.php?id={cmid} which redirects       │
     │                                                                         │
     │ Document Access Pattern                                                 │
     │                                                                         │
     │ - Documents are course resources with unique cmid (course module ID)    │
     │ - API methods available (via Moodle Web Services):                      │
     │   - core_course_get_courses - List all courses                          │
     │   - core_course_get_contents - Get course contents including documents  │
     │   - core_enrol_get_users_courses - Get user's enrolled courses          │
     │                                                                         │
     │ MCP Server Implementation Plan                                          │
     │                                                                         │
     │ Features                                                                │
     │                                                                         │
     │ 1. Authentication: Store and use web service token                      │
     │ 2. List Courses: Get all enrolled courses                               │
     │ 3. Get Course Contents: List all resources/documents in a course        │
     │ 4. Download Documents: Fetch document content by cmid or file URL       │
     │ 5. Search: Find documents by name across courses                        │
     │                                                                         │
     │ Technical Approach                                                      │
     │                                                                         │
     │ - Use Moodle REST API with token authentication                         │
     │ - Create token via /login/token.php with credentials                    │
     │ - Store token securely in MCP server configuration                      │
     │ - Implement key Moodle Web Service functions                            │
     │ - Handle file downloads through authenticated requests                  │
     │                                                                         │
     │ Implementation Steps                                                    │
     │                                                                         │
     │ 1. Create MCP server skeleton with TypeScript/Python                    │
     │ 2. Implement token-based authentication                                 │
     │ 3. Add course listing functionality                                     │
     │ 4. Add course contents retrieval                                        │
     │ 5. Add document download with proper authentication                     │
     │ 6. Add error handling and token refresh                                 │
     │ 7. Add configuration for credentials/token storage 
