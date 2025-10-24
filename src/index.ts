#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { MoodleClient } from './moodle-client.js';

/**
 * Moodle MCP Server
 * Provides integration with Moodle LMS through the Model Context Protocol
 */

// Configuration from environment variables
const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_USERNAME = process.env.MOODLE_USERNAME;
const MOODLE_PASSWORD = process.env.MOODLE_PASSWORD;
const MOODLE_SERVICE = process.env.MOODLE_SERVICE || 'moodle_mobile_app';

if (!MOODLE_URL || !MOODLE_USERNAME || !MOODLE_PASSWORD) {
  console.error('Error: Required environment variables not set');
  console.error('Please set: MOODLE_URL, MOODLE_USERNAME, MOODLE_PASSWORD');
  process.exit(1);
}

// Initialize Moodle client
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
        const courses = await moodleClient.getUserCourses();
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
        const contents = await moodleClient.getCourseContents(courseId);
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
        const { query } = args as { query: string };
        const results = await moodleClient.searchResources(query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
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
              text: JSON.stringify(documents, null, 2),
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

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Moodle MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
