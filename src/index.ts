#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';
import { MoodleClient } from './moodle-client.js';

/**
 * Moodle MCP Server
 * Provides integration with Moodle LMS through the Model Context Protocol
 */

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_USERNAME = process.env.MOODLE_USERNAME;
const MOODLE_PASSWORD = process.env.MOODLE_PASSWORD;
const MOODLE_SERVICE = process.env.MOODLE_SERVICE || 'moodle_mobile_app';

if (!MOODLE_URL || !MOODLE_USERNAME || !MOODLE_PASSWORD) {
  console.error('Error: Required environment variables not set');
  console.error('Please set: MOODLE_URL, MOODLE_USERNAME, MOODLE_PASSWORD');
  process.exit(1);
}

const moodleClient = new MoodleClient({
  url: MOODLE_URL,
  username: MOODLE_USERNAME,
  password: MOODLE_PASSWORD,
  service: MOODLE_SERVICE,
});

// Define MCP tools
const tools: Tool[] = [
  {
    name: 'list_courses',
    description: 'List all courses the user is enrolled in',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_course_contents',
    description: 'Get all contents (sections, modules, resources) of a specific course',
    inputSchema: {
      type: 'object',
      properties: {
        courseId: {
          type: 'number',
          description: 'The ID of the course',
        },
      },
      required: ['courseId'],
    },
  },
  {
    name: 'search_resources',
    description: 'Search for resources by name across all enrolled courses. Returns results with download URLs that can be used directly.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to match against resource names',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50, max: 200)',
          default: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for files by filename across all enrolled courses. Returns file details including download URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to match against filenames',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50, max: 200)',
          default: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_course_documents',
    description: 'Get all documents and files from a specific course with their download URLs',
    inputSchema: {
      type: 'object',
      properties: {
        courseId: {
          type: 'number',
          description: 'The ID of the course',
        },
      },
      required: ['courseId'],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'moodle-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_courses': {
        const courses = await moodleClient.getUserCoursesSimplified();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(courses, null, 2),
            },
          ],
        };
      }

      case 'get_course_contents': {
        const { courseId } = args as { courseId: number };
        const contents = await moodleClient.getCourseContentsSimplified(courseId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(contents, null, 2),
            },
          ],
        };
      }

      case 'search_resources': {
        const { query, limit = 50 } = args as { query: string; limit?: number };
        const maxLimit = Math.min(limit, 200); // Cap at 200 to avoid token limits
        const results = await moodleClient.searchResources(query, maxLimit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query,
                limit: maxLimit,
                count: results.length,
                results,
              }, null, 2),
            },
          ],
        };
      }

      case 'search_files': {
        const { query, limit = 50 } = args as { query: string; limit?: number };
        const maxLimit = Math.min(limit, 200); // Cap at 200 to avoid token limits
        const results = await moodleClient.searchFiles(query, maxLimit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query,
                limit: maxLimit,
                count: results.length,
                files: results,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_course_documents': {
        const { courseId } = args as { courseId: number };
        const documents = await moodleClient.getCourseDocuments(courseId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                courseId,
                documentsCount: documents.length,
                documents,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Handle resource list requests
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources: Resource[] = [];

  try {
    // Get all courses
    const courses = await moodleClient.getUserCoursesSimplified();

    // Add resources for each course's files
    for (const course of courses) {
      try {
        const documents = await moodleClient.getCourseDocuments(course.id);

        for (const doc of documents) {
          for (const file of doc.files) {
            resources.push({
              uri: `moodle://file/${encodeURIComponent(file.downloadUrl)}`,
              name: `${course.fullname} - ${doc.moduleName} - ${file.filename}`,
              description: `File from ${course.fullname} (${Math.round(file.filesize / 1024)} KB)`,
              mimeType: file.mimetype,
            });
          }
        }
      } catch (error) {
        // Skip courses that fail to load
        console.error(`Failed to load resources for course ${course.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to list resources:', error);
  }

  return { resources };
});

// Handle resource read requests
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (!uri.startsWith('moodle://file/')) {
    throw new Error(`Unsupported resource URI: ${uri}`);
  }

  try {
    // Extract the download URL from the URI
    const downloadUrl = decodeURIComponent(uri.replace('moodle://file/', ''));

    // Fetch the file content
    const fileContent = await moodleClient.getFileContent(downloadUrl);

    return {
      contents: [
        {
          uri,
          mimeType: fileContent.mimeType,
          blob: fileContent.content,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read resource: ${errorMessage}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Moodle MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
