# Moodle MCP Server Usage Guide

## Available Tools

The Moodle MCP server provides the following tools:

### 1. list_courses

Lists all courses the authenticated user is enrolled in.

**Parameters:** None

**Example Response:**
```json
[
  {
    "id": 2,
    "shortname": "CS101",
    "fullname": "Introduction to Computer Science",
    "displayname": "Introduction to Computer Science",
    "enrolledusercount": 150,
    "visible": 1,
    "summary": "Learn the basics of programming...",
    "format": "topics"
  }
]
```

### 2. get_course_contents

Retrieves all contents (sections, modules, resources) of a specific course.

**Parameters:**
- `courseId` (number, required): The ID of the course

**Example Request:**
```json
{
  "courseId": 2
}
```

**Example Response:**
```json
[
  {
    "id": 1,
    "name": "Introduction",
    "summary": "Welcome to the course",
    "modules": [
      {
        "id": 123,
        "name": "Course Syllabus",
        "modname": "resource",
        "url": "https://moodle.example.com/mod/resource/view.php?id=123",
        "contents": [
          {
            "filename": "syllabus.pdf",
            "filesize": 524288,
            "fileurl": "https://moodle.example.com/pluginfile.php/...",
            "mimetype": "application/pdf"
          }
        ]
      }
    ]
  }
]
```

### 3. get_course_documents

Gets all documents and files from a specific course with their download URLs that can be used directly for downloading.

**Parameters:**
- `courseId` (number, required): The ID of the course

**Example Request:**
```json
{
  "courseId": 2
}
```

**Example Response:**
```json
[
  {
    "sectionName": "Week 1",
    "moduleName": "Lecture Notes",
    "moduleType": "resource",
    "files": [
      {
        "filename": "lecture1.pdf",
        "filesize": 1048576,
        "downloadUrl": "https://moodle.example.com/pluginfile.php/...?token=abc123",
        "mimetype": "application/pdf",
        "timemodified": 1634567890
      }
    ]
  }
]
```

**Note:** The `downloadUrl` includes the authentication token and can be used directly for downloading files.

### 4. search_resources

Searches for resources by name across all enrolled courses. Returns results with download URLs included for resources that have files.

**Parameters:**
- `query` (string, required): Search query to match against resource names

**Example Request:**
```json
{
  "query": "lecture"
}
```

**Example Response:**
```json
[
  {
    "courseId": 2,
    "courseName": "Introduction to Computer Science",
    "moduleName": "Lecture 1 Notes",
    "moduleUrl": "https://moodle.example.com/mod/resource/view.php?id=456",
    "type": "resource",
    "files": [
      {
        "filename": "lecture1.pdf",
        "filesize": 524288,
        "downloadUrl": "https://moodle.example.com/pluginfile.php/...?token=abc123",
        "mimetype": "application/pdf",
        "timemodified": 1634567890
      }
    ]
  }
]
```

**Note:** The `files` array is only present for resources that have downloadable content. The `downloadUrl` includes the authentication token and can be used directly.

## Typical Workflows

### Workflow 1: Browse and Download Course Materials

1. List all your courses using `list_courses`
2. Get course documents using `get_course_documents` with a course ID
3. Use the `downloadUrl` from the results to download files directly

### Workflow 2: Search for Specific Resources

1. Search for resources using `search_resources` with a query (e.g., "lecture", "assignment")
2. Get the `downloadUrl` directly from search results for files
3. Navigate to the `moduleUrl` to view the resource in Moodle

### Workflow 3: Quick File Access

1. Use `search_resources` to find specific files by name
2. Download files directly using the `downloadUrl` included in the response
3. No additional API calls needed!

## Error Handling

All tools return errors in the following format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: <error message>"
    }
  ],
  "isError": true
}
```

Common errors:
- Authentication errors: Invalid credentials or expired token
- Permission errors: User doesn't have access to the requested resource
- Network errors: Connection issues with Moodle server
- Not found errors: Course or resource doesn't exist

## Tips

1. **Performance**: `search_resources` queries all enrolled courses, so it may take a while if you're enrolled in many courses
2. **Direct Downloads**: Download URLs include the authentication token and can be used directly in HTTP clients, browsers, or download tools
3. **Authentication**: The token is automatically managed and included in download URLs, so you don't need to handle authentication separately
4. **Module Types**: Common module types include:
   - `resource`: Documents and files
   - `url`: External links
   - `assign`: Assignments
   - `forum`: Discussion forums
   - `quiz`: Quizzes
   - `folder`: Folders containing multiple files
5. **File Information**: Both `search_resources` and `get_course_documents` return file metadata (size, MIME type, modification time) along with download URLs
