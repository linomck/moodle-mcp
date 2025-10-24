# Testing the Moodle MCP Server

This guide explains how to test the Moodle MCP server without connecting to an AI assistant.

## Method 1: Standalone Test Script (Recommended)

The standalone test script directly tests the Moodle API client functionality without requiring an MCP client.

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your Moodle credentials:
```bash
cp .env.example .env
```

3. Edit `.env` and add your credentials:
```bash
MOODLE_URL=https://your-moodle-instance.com
MOODLE_USERNAME=your_username
MOODLE_PASSWORD=your_password
```

### Run Tests

Run the test suite:
```bash
npm test
```

Or run in development mode (without building):
```bash
npm run test:dev
```

### What the Test Script Does

The test script will:

1. ✅ **Authenticate** - Test connection and token generation
2. ✅ **List Courses** - Display all enrolled courses
3. ✅ **Get Course Contents** - Show sections and modules from the first course
4. ✅ **Get Course Documents** - List all downloadable files
5. ✅ **Search Resources** - Search for resources containing "assignment"
6. ✅ **Download File** - Download a small file (< 1MB) if available

### Example Output

```
🧪 Moodle MCP Server Test Suite

Configuration:
  URL: https://moodle.example.com
  Username: testuser
  Service: moodle_mobile_app

📝 Test 1: Authentication
Authenticating with Moodle...
✅ Authentication successful
   Token: a1b2c3d4e5f6g7h8i9j0...

📝 Test 2: List Enrolled Courses
✅ Found 3 enrolled courses:
   1. [ID: 2] Introduction to Computer Science
   2. [ID: 5] Web Development
   3. [ID: 8] Database Systems

📝 Test 3: Get Course Contents
Getting contents for: "Introduction to Computer Science" (ID: 2)
✅ Found 12 sections:
   1. Introduction (3 modules)
   2. Week 1 (5 modules)
   3. Week 2 (4 modules)
   ...
   Total modules: 45
   Total files: 23

📝 Test 4: Get Course Documents
Getting all documents from: "Introduction to Computer Science"
✅ Found 8 modules with files:
   1. Course Syllabus (resource)
      - syllabus.pdf (0.52 MB)
   2. Lecture 1 Notes (resource)
      - lecture1.pdf (1.24 MB)
   ...

📝 Test 5: Search Resources
Searching for: "assignment"
✅ Found 12 matching resources:
   1. Assignment 1: Variables
      Course: Introduction to Computer Science
      Type: assign
   ...

📝 Test 6: Download File
Downloading: syllabus.pdf
✅ File downloaded successfully
   Size: 524288 bytes
   First 50 chars of base64: JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFs...

✅ All tests completed successfully!
```

## Method 2: MCP Inspector (Test Full MCP Protocol)

The MCP Inspector is an official tool for testing MCP servers interactively.

### Install MCP Inspector

```bash
npm install -g @modelcontextprotocol/inspector
```

### Run the Server with Inspector

```bash
# Set environment variables
export MOODLE_URL=https://your-moodle-instance.com
export MOODLE_USERNAME=your_username
export MOODLE_PASSWORD=your_password

# Run the inspector
mcp-inspector node dist/index.js
```

This will:
1. Start your MCP server
2. Open a web interface at `http://localhost:5173`
3. Allow you to test all MCP tools interactively

### Using the Inspector

In the web interface:

1. **View Available Tools** - See all 5 tools (list_courses, get_course_contents, etc.)
2. **Test Tool Calls** - Execute tools with parameters
3. **View Responses** - See the JSON responses from each tool
4. **Debug Issues** - See detailed logs and error messages

### Example: Test list_courses

1. Select `list_courses` from the tools list
2. Click "Execute" (no parameters needed)
3. View the JSON response with all your courses

### Example: Test get_course_contents

1. Select `get_course_contents` from the tools list
2. Enter parameters:
   ```json
   {
     "courseId": 2
   }
   ```
3. Click "Execute"
4. View the course structure in the response

## Method 3: Manual cURL Testing

You can test the Moodle API directly using cURL.

### Get Authentication Token

```bash
curl -X POST "https://your-moodle-instance.com/login/token.php" \
  -d "username=your_username" \
  -d "password=your_password" \
  -d "service=moodle_mobile_app"
```

Response:
```json
{"token":"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"}
```

### List Courses

```bash
TOKEN="your_token_here"
USERID="your_user_id"

curl "https://your-moodle-instance.com/webservice/rest/server.php?wstoken=${TOKEN}&wsfunction=core_enrol_get_users_courses&userid=${USERID}&moodlewsrestformat=json"
```

### Get Course Contents

```bash
TOKEN="your_token_here"
COURSE_ID=2

curl "https://your-moodle-instance.com/webservice/rest/server.php?wstoken=${TOKEN}&wsfunction=core_course_get_contents&courseid=${COURSE_ID}&moodlewsrestformat=json"
```

## Troubleshooting

### Authentication Fails

**Error**: `Moodle authentication error: Invalid login`

**Solutions**:
- Verify your username and password are correct
- Check if your Moodle account is active
- Ensure Web Services are enabled in your Moodle instance

### Web Services Not Enabled

**Error**: `Web services are not enabled`

**Solutions**:
- Contact your Moodle administrator
- If you're an admin, go to: Site administration > Server > Web services > Overview
- Enable web services and configure the mobile app service

### Token Not Generated

**Error**: `No token received from Moodle`

**Solutions**:
- Check if the service name is correct (default: `moodle_mobile_app`)
- Verify your user has permission to use web services
- Check Moodle logs for more details

### Connection Timeout

**Error**: `Authentication failed: timeout of 30000ms exceeded`

**Solutions**:
- Check your internet connection
- Verify the Moodle URL is correct
- Ensure the Moodle server is accessible from your location

### No Courses Found

**Warning**: `No courses found. Cannot proceed with further tests.`

**Solutions**:
- Enroll in at least one course in your Moodle instance
- Verify your user account has active enrollments
- Check if courses are visible to your user role

## Best Practices

1. **Start with Standalone Tests** - Use `npm test` first to verify basic connectivity
2. **Use Small Test Data** - Test with courses that have limited content
3. **Check Permissions** - Ensure your test user has appropriate permissions
4. **Monitor Performance** - Search operations can be slow with many courses
5. **Test Error Cases** - Try invalid course IDs to verify error handling

## Next Steps

After successful testing:

1. ✅ Verify all tools work correctly
2. ✅ Test with different course types and content
3. ✅ Configure Claude Desktop integration (see README.md)
4. ✅ Start using the MCP server with AI assistants
