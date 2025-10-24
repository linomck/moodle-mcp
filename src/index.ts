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
    description: 'Search for resources by name across all enrolled courses. Returns up to a specified limit to avoid token limits.',
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
    name: 'download_file',
    description: 'Get an authenticated download URL for a file from Moodle. Returns metadata and URL that can be used to download the file.',
    inputSchema: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          description: 'The URL of the file to download (from module contents)',
        },
      },
      required: ['fileUrl'],
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
  {
    name: 'get_module_files',
    description: 'Get detailed file information for a specific module, including authenticated download URLs',
    inputSchema: {
      type: 'object',
      properties: {
        courseId: {
          type: 'number',
          description: 'The ID of the course',
        },
        moduleId: {
          type: 'number',
          description: 'The ID of the module',
        },
      },
      required: ['courseId', 'moduleId'],
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
                note: 'Use the download_file tool with fileurl to get authenticated download URLs',
              }, null, 2),
            },
          ],
        };
      }

      case 'download_file': {
        const { fileUrl } = args as { fileUrl: string };
        const fileInfo = await moodleClient.getFileInfo(fileUrl);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'File info retrieved successfully. Use the authenticatedUrl to download the file.',
                filename: fileInfo.filename,
                size: fileInfo.size,
                mimetype: fileInfo.mimetype,
                authenticatedUrl: fileInfo.authenticatedUrl,
                note: 'The authenticated URL includes the token and can be used to download the file directly.'
              }, null, 2),
            },
          ],
        };
      }

      case 'get_course_documents': {
        const { courseId } = args as { courseId: number };
        const contents = await moodleClient.getCourseContents(courseId);

        // Extract all documents/files with essential info only
        const documents: Array<{
          sectionName: string;
          moduleName: string;
          moduleType: string;
          moduleId: number;
          files: Array<{
            filename: string;
            filesize: number;
            fileurl: string;
            mimetype?: string;
          }>;
        }> = [];

        for (const section of contents) {
          for (const module of section.modules) {
            if (module.contents && module.contents.length > 0) {
              documents.push({
                sectionName: section.name,
                moduleName: module.name,
                moduleType: module.modname,
                moduleId: module.id,
                files: module.contents
                  .filter(content => content.type === 'file') // Only include actual files
                  .map((content) => ({
                    filename: content.filename,
                    filesize: content.filesize,
                    fileurl: content.fileurl,
                    mimetype: content.mimetype,
                  })),
              });
            }
          }
        }

        // Filter out modules with no files
        const documentsWithFiles = documents.filter(doc => doc.files.length > 0);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                courseId,
                totalModulesWithFiles: documentsWithFiles.length,
                documents: documentsWithFiles,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_module_files': {
        const { courseId, moduleId } = args as { courseId: number; moduleId: number };
        const contents = await moodleClient.getCourseContents(courseId);

        // Find the specific module
        let targetModule = null;
        let sectionName = '';

        for (const section of contents) {
          const module = section.modules.find(m => m.id === moduleId);
          if (module) {
            targetModule = module;
            sectionName = section.name;
            break;
          }
        }

        if (!targetModule) {
          throw new Error(`Module ${moduleId} not found in course ${courseId}`);
        }

        if (!targetModule.contents || targetModule.contents.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: 'Module has no files',
                  moduleId,
                  moduleName: targetModule.name,
                }, null, 2),
              },
            ],
          };
        }

        // Get file info for each file with authenticated URLs
        const fileDetails = targetModule.contents
          .filter(content => content.type === 'file')
          .map(content => ({
            filename: content.filename,
            filesize: content.filesize,
            fileurl: content.fileurl,
            mimetype: content.mimetype,
          }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sectionName,
                moduleId: targetModule.id,
                moduleName: targetModule.name,
                moduleType: targetModule.modname,
                filesCount: fileDetails.length,
                files: fileDetails,
                note: 'Use the download_file tool with fileurl to get authenticated download URLs',
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
