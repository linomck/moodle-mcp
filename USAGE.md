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

Gets all documents and files from a specific course with their download URLs.

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
        "fileurl": "https://moodle.example.com/pluginfile.php/...",
        "mimetype": "application/pdf",
        "timemodified": 1634567890
      }
    ]
  }
]
```

### 4. search_resources

Searches for resources by name across all enrolled courses.

**Parameters:**
- `query` (string, required): Search query to match against resource names

**Example Request:**
```json
{
  "query": "assignment"
}
```

**Example Response:**
```json
[
  {
    "courseId": 2,
    "courseName": "Introduction to Computer Science",
    "moduleName": "Assignment 1: Variables",
    "moduleUrl": "https://moodle.example.com/mod/assign/view.php?id=456",
    "type": "assign"
  }
]
```

### 5. download_file

Downloads a file from Moodle by its URL and returns the content as base64.

**Parameters:**
- `fileUrl` (string, required): The URL of the file to download (from module contents)

**Example Request:**
```json
{
  "fileUrl": "https://moodle.example.com/pluginfile.php/123/mod_resource/content/1/document.pdf"
}
```

**Example Response:**
```
File downloaded successfully. Size: 524288 bytes
Base64 content:
JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRv...
```

## Typical Workflows

### Workflow 1: Browse and Download Course Materials

1. List all your courses using `list_courses`
2. Get course contents using `get_course_contents` with a course ID
3. Download specific files using `download_file` with the file URL from step 2

### Workflow 2: Find and Access Assignments

1. Search for assignments using `search_resources` with query "assignment"
2. Navigate to the assignment URL from the search results

### Workflow 3: Bulk Document Access

1. List all your courses using `list_courses`
2. For each course, use `get_course_documents` to get all downloadable files
3. Download needed files using `download_file`

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
2. **File Downloads**: Large files will result in large base64 responses. Consider file size before downloading
3. **Authentication**: The token is automatically refreshed if expired, so you don't need to handle re-authentication
4. **Module Types**: Common module types include:
   - `resource`: Documents and files
   - `url`: External links
   - `assign`: Assignments
   - `forum`: Discussion forums
   - `quiz`: Quizzes
   - `folder`: Folders containing multiple files
