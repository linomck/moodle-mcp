<div align="center">

# 🎓 Moodle MCP Server

**Model Context Protocol integration for Moodle LMS**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0.4-purple.svg)](https://modelcontextprotocol.io)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

A powerful Model Context Protocol (MCP) server that seamlessly integrates AI assistants with Moodle Learning Management System. Enable your AI assistant to access courses, retrieve educational content, download resources, and search through your learning materials.

> **🔌 Compatible with**: Claude Desktop, and any MCP-compatible AI assistant

## ✨ Features

- 🔐 **Secure Authentication** - Token-based auth using Moodle Web Services
- 📚 **Course Management** - List and access all enrolled courses
- 📄 **Content Retrieval** - Get sections, modules, and resources from courses
- 💾 **Document Access** - Download files and documents with proper authentication
- 🔍 **Smart Search** - Find resources by name across all enrolled courses
- 🛡️ **Error Handling** - Comprehensive error handling with automatic token refresh
- 🚀 **TypeScript** - Fully typed for better developer experience

## 🎯 Use Cases

- **Study Assistant**: Let AI help you navigate course materials
- **Content Organization**: Search and organize learning resources
- **Course Overview**: Get quick summaries of course structures
- **Resource Discovery**: Find specific documents across multiple courses
- **Learning Analytics**: Analyze course content and structure

## 📋 Prerequisites

- **Node.js** 18 or higher
- **Moodle Instance** with Web Services enabled
- **Valid Credentials** with API access to your Moodle instance

## 🚀 Installation

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd moodle-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

1. **Create environment file**

```bash
cp .env.example .env
```

2. **Configure your credentials**

```bash
MOODLE_URL=https://your-moodle-instance.com
MOODLE_USERNAME=your_username
MOODLE_PASSWORD=your_password
MOODLE_SERVICE=moodle_mobile_app  # Optional
```

### Moodle Web Services Setup

Your Moodle instance must have Web Services enabled. If you're a Moodle administrator:

1. Navigate to **Site administration → Server → Web services → Overview**
2. Follow the setup wizard to enable web services
3. Create or use the built-in `moodle_mobile_app` service
4. Ensure these functions are enabled:
   - `core_webservice_get_site_info`
   - `core_enrol_get_users_courses`
   - `core_course_get_courses`
   - `core_course_get_contents`

## 🎮 Usage

### Running the Server

```bash
# Production
node dist/index.js

# Development with auto-reload
npm run dev
```

### Integration with Claude Desktop

Add to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "moodle": {
      "command": "node",
      "args": ["/absolute/path/to/moodle-mcp/dist/index.js"],
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

| Tool | Description |
|------|-------------|
| `list_courses` | List all enrolled courses with details |
| `get_course_contents` | Retrieve complete course structure with sections and modules |
| `get_course_documents` | Get all downloadable files from a course with direct URLs |
| `search_resources` | Search for resources by name across all courses |

> 📚 **Detailed documentation**: See [USAGE.md](USAGE.md) for comprehensive tool documentation

## 🧪 Testing

### Quick Test

```bash
# Run the complete test suite
npm test
```

### Testing Options

| Method | Description |
|--------|-------------|
| **Automated Tests** | `npm test` - Full test suite |
| **MCP Inspector** | Interactive web-based tool testing |
| **Standalone Script** | Direct API testing without MCP |
| **Manual cURL** | Test Moodle API endpoints directly |

> 📘 **Full testing guide**: See [TESTING.md](TESTING.md)

## 🏗️ Development

### Project Structure

```
moodle-mcp/
├── src/
│   ├── index.ts          # MCP server implementation
│   ├── moodle-client.ts  # Moodle API client
│   ├── types.ts          # TypeScript type definitions
│   └── test.ts           # Standalone test script
├── dist/                 # Compiled JavaScript
├── .env.example          # Environment template
├── README.md             # This file
├── USAGE.md              # Tool usage guide
└── TESTING.md            # Testing guide
```

### Commands

```bash
# Build the project
npm run build

# Watch mode (auto-rebuild)
npm run watch

# Run tests
npm test

# Development mode
npm run dev
```

## 🔧 API Architecture

### Authentication Flow

```
1. Token Generation → POST /login/token.php
2. API Calls        → GET/POST /webservice/rest/server.php?wstoken={token}
3. File Downloads   → GET /pluginfile.php/...?token={token}
```

### Moodle Web Services

- `core_webservice_get_site_info` - User and site information
- `core_enrol_get_users_courses` - Enrolled courses list
- `core_course_get_courses` - All available courses
- `core_course_get_contents` - Course structure and resources

## 📚 Documentation

- **[USAGE.md](USAGE.md)** - Comprehensive guide to all available tools
- **[TESTING.md](TESTING.md)** - Testing instructions and methods
- **[MCP Documentation](https://modelcontextprotocol.io)** - Learn more about MCP

## 🐛 Troubleshooting

<details>
<summary><strong>Authentication Errors</strong></summary>

- ✅ Verify credentials are correct in `.env`
- ✅ Ensure Web Services are enabled in Moodle
- ✅ Check service name matches your Moodle configuration
- ✅ Verify user has appropriate API access permissions

</details>

<details>
<summary><strong>Permission Errors</strong></summary>

- ✅ Verify user has appropriate role permissions in Moodle
- ✅ Some resources may be restricted based on enrollment
- ✅ Check course visibility settings

</details>

<details>
<summary><strong>Connection Errors</strong></summary>

- ✅ Verify Moodle URL is correct and accessible
- ✅ Check network connection and firewall settings
- ✅ Ensure Moodle instance accepts API requests
- ✅ Try accessing Moodle URL directly in browser

</details>

## 🔒 Security

- 🔐 Store credentials securely using environment variables
- 🌐 Use HTTPS for Moodle connections in production
- 🔄 Regularly rotate passwords and tokens
- 📋 Follow your organization's security policies
- ⚠️ Never commit `.env` file to version control

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. 🍴 Fork the repository
2. 🔨 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m 'Add amazing feature'`)
4. 📤 Push to the branch (`git push origin feature/amazing-feature`)
5. 🎉 Open a Pull Request

Please ensure your PR:
- ✅ Includes tests for new features
- ✅ Updates documentation as needed
- ✅ Follows existing code style
- ✅ Passes all tests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by [Moodle LMS](https://moodle.org/)
- TypeScript & Node.js ecosystem

## 📞 Support

- 📖 [Documentation](USAGE.md)
- 🐛 [Issue Tracker](../../issues)
- 💬 [Discussions](../../discussions)

---

<div align="center">

**Made with ❤️ for the Moodle and AI community**

⭐ Star this repo if you find it helpful!

</div>
