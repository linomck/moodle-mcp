# Moodle MCP Server

A Model Context Protocol (MCP) server that provides integration with Moodle LMS. This server allows AI assistants to interact with Moodle courses, retrieve course contents, download documents, and search for resources.

## Features

- **Authentication**: Secure token-based authentication using Moodle Web Services
- **List Courses**: Get all courses the user is enrolled in
- **Course Contents**: Retrieve all sections, modules, and resources from a course
- **Document Access**: Download files and documents with proper authentication
- **Search**: Find resources by name across all enrolled courses
- **Error Handling**: Comprehensive error handling with automatic token refresh

## Prerequisites

- Node.js 18 or higher
- A Moodle instance with Web Services enabled
- Valid Moodle credentials with API access

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd moodle-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file in the project root (use `.env.example` as template):

```bash
MOODLE_URL=https://your-moodle-instance.com
MOODLE_USERNAME=your_username
MOODLE_PASSWORD=your_password
MOODLE_SERVICE=moodle_mobile_app  # Optional, defaults to moodle_mobile_app
```

### Moodle Web Services Setup

Your Moodle instance must have Web Services enabled. If you're a Moodle administrator:

1. Go to **Site administration > Server > Web services > Overview**
2. Follow the setup wizard to enable web services
3. Create a service (or use the built-in `moodle_mobile_app` service)
4. Ensure the following functions are enabled:
   - `core_webservice_get_site_info`
   - `core_enrol_get_users_courses`
   - `core_course_get_courses`
   - `core_course_get_contents`

## Usage

### Running the Server

The MCP server communicates via stdio and is designed to be used with MCP-compatible clients:

```bash
node dist/index.js
```

Or for development:

```bash
npm run dev
```

### Integration with Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "moodle": {
      "command": "node",
      "args": ["/path/to/moodle-mcp/dist/index.js"],
      "env": {
        "MOODLE_URL": "https://your-moodle-instance.com",
        "MOODLE_USERNAME": "your_username",
        "MOODLE_PASSWORD": "your_password"
      }
    }
  }
}
```

### Available Tools

See [USAGE.md](USAGE.md) for detailed documentation of all available tools:

1. **list_courses** - List all enrolled courses
2. **get_course_contents** - Get course sections and modules
3. **get_course_documents** - Get all downloadable files from a course
4. **search_resources** - Search for resources by name
5. **download_file** - Download file content as base64

## Testing

You can test the MCP server without connecting to an AI assistant. See [TESTING.md](TESTING.md) for detailed instructions.

### Quick Test

```bash
# 1. Create .env file with your Moodle credentials
cp .env.example .env
# Edit .env with your credentials

# 2. Run the test suite
npm test
```

This will test all functionality including authentication, course listing, content retrieval, search, and file downloads.

### Other Testing Methods

- **Standalone Test Script** - Direct API testing without MCP (see TESTING.md)
- **MCP Inspector** - Interactive web-based testing of MCP tools
- **Manual cURL** - Test Moodle API endpoints directly

## Development

### Project Structure

```
moodle-mcp/
├── src/
│   ├── index.ts          # MCP server implementation
│   ├── moodle-client.ts  # Moodle API client
│   ├── types.ts          # TypeScript type definitions
│   └── test.ts           # Standalone test script
├── dist/                 # Compiled JavaScript (generated)
├── .env.example          # Environment variables template
├── package.json
├── tsconfig.json
├── README.md             # Main documentation
├── USAGE.md              # Tool usage guide
└── TESTING.md            # Testing guide
```

### Building

```bash
npm run build
```

### Watch Mode

For development with auto-rebuild:

```bash
npm run watch
```

## API Architecture

### Authentication System

The server uses Moodle's token-based authentication:

1. **Token Generation**: POST to `/login/token.php` with credentials
2. **API Calls**: GET/POST to `/webservice/rest/server.php` with token
3. **File Downloads**: Authenticated requests to `/pluginfile.php` with token

### Moodle Web Services Used

- `core_webservice_get_site_info` - Get user information
- `core_enrol_get_users_courses` - List enrolled courses
- `core_course_get_courses` - Get all available courses
- `core_course_get_contents` - Get course structure and resources

## Troubleshooting

### Authentication Errors

- Verify your Moodle credentials are correct
- Ensure Web Services are enabled on your Moodle instance
- Check that the service name matches your Moodle configuration

### Permission Errors

- Verify your user has appropriate permissions in Moodle
- Some resources may be restricted based on enrollment or role

### Connection Errors

- Verify the Moodle URL is correct and accessible
- Check your network connection
- Ensure your Moodle instance accepts API requests

## Security Considerations

- Store credentials securely (use environment variables, not hardcoded values)
- Use HTTPS for Moodle connections in production
- Regularly rotate passwords and tokens
- Follow your organization's security policies

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## Technical Analysis & Implementation Notes

### Moodle API Endpoints

1. **REST API**: `/webservice/rest/server.php`
   - Format: `?wstoken={token}&wsfunction={function}&moodlewsrestformat=json`

2. **File Downloads**: `/pluginfile.php/{contextid}/{component}/{filearea}/{itemid}/{filename}`
   - Requires authentication (token parameter)

### Document Access Pattern

- Documents are course resources with unique course module ID (cmid)
- Files are accessed through module contents
- Download URLs include authentication tokens

### Implementation Details

- **Language**: TypeScript with Node.js
- **MCP SDK**: @modelcontextprotocol/sdk v1.0.4
- **HTTP Client**: Axios for API requests
- **Transport**: Stdio for MCP communication
- **Authentication**: Automatic token management with refresh capability
