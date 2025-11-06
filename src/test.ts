#!/usr/bin/env node

/**
 * Standalone test script for Moodle MCP Server
 * Tests Moodle API functionality without requiring MCP client
 */

import { MoodleClient } from './moodle-client.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_USERNAME = process.env.MOODLE_USERNAME;
const MOODLE_PASSWORD = process.env.MOODLE_PASSWORD;
const MOODLE_SERVICE = process.env.MOODLE_SERVICE || 'moodle_mobile_app';

if (!MOODLE_URL || !MOODLE_USERNAME || !MOODLE_PASSWORD) {
  console.error('❌ Error: Required environment variables not set');
  console.error('Please create a .env file with:');
  console.error('  MOODLE_URL=https://your-moodle-instance.com');
  console.error('  MOODLE_USERNAME=your_username');
  console.error('  MOODLE_PASSWORD=your_password');
  process.exit(1);
}

// Initialize Moodle client
const client = new MoodleClient({
  url: MOODLE_URL,
  username: MOODLE_USERNAME,
  password: MOODLE_PASSWORD,
  service: MOODLE_SERVICE,
});

async function runTests() {
  console.log('🧪 Moodle MCP Server Test Suite\n');
  console.log('Configuration:');
  console.log(`  URL: ${MOODLE_URL}`);
  console.log(`  Username: ${MOODLE_USERNAME}`);
  console.log(`  Service: ${MOODLE_SERVICE}\n`);

  try {
    // Test 1: Authentication
    console.log('📝 Test 1: Authentication');
    console.log('Authenticating with Moodle...');
    const token = await client.authenticate();
    console.log('✅ Authentication successful');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Test 2: List Courses
    console.log('📝 Test 2: List Enrolled Courses');
    const courses = await client.getUserCourses();
    console.log(`✅ Found ${courses.length} enrolled courses:`);
    courses.forEach((course, index) => {
      console.log(`   ${index + 1}. [ID: ${course.id}] ${course.fullname}`);
    });
    console.log();

    if (courses.length === 0) {
      console.log('⚠️  No courses found. Cannot proceed with further tests.');
      return;
    }

    // Test 3: Get Course Contents
    const testCourse = courses[0];
    console.log(`📝 Test 3: Get Course Contents`);
    console.log(`Getting contents for: "${testCourse.fullname}" (ID: ${testCourse.id})`);
    const contents = await client.getCourseContents(testCourse.id);
    console.log(`✅ Found ${contents.length} sections:`);

    let totalModules = 0;
    let totalFiles = 0;

    contents.forEach((section, index) => {
      const moduleCount = section.modules.length;
      totalModules += moduleCount;
      console.log(`   ${index + 1}. ${section.name} (${moduleCount} modules)`);

      // Count files
      section.modules.forEach(module => {
        if (module.contents) {
          totalFiles += module.contents.length;
        }
      });
    });
    console.log(`   Total modules: ${totalModules}`);
    console.log(`   Total files: ${totalFiles}\n`);

    // Test 4: Get Course Documents
    console.log(`📝 Test 4: Get Course Documents`);
    console.log(`Getting all documents from: "${testCourse.fullname}"`);

    const documents: Array<{
      sectionName: string;
      moduleName: string;
      moduleType: string;
      files: any[];
    }> = [];

    for (const section of contents) {
      for (const module of section.modules) {
        if (module.contents && module.contents.length > 0) {
          documents.push({
            sectionName: section.name,
            moduleName: module.name,
            moduleType: module.modname,
            files: module.contents.map((content) => ({
              filename: content.filename,
              filesize: content.filesize,
              fileurl: content.fileurl,
              mimetype: content.mimetype,
            })),
          });
        }
      }
    }

    console.log(`✅ Found ${documents.length} modules with files:`);
    documents.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.moduleName} (${doc.moduleType})`);
      doc.files.forEach(file => {
        const sizeMB = (file.filesize / 1024 / 1024).toFixed(2);
        console.log(`      - ${file.filename} (${sizeMB} MB)`);
      });
    });
    console.log();

    // Test 5: Search Resources
    console.log(`📝 Test 5: Search Resources`);
    const searchQuery = 'assignment';
    console.log(`Searching for: "${searchQuery}"`);
    const searchResults = await client.searchResources(searchQuery);
    console.log(`✅ Found ${searchResults.length} matching resources:`);
    searchResults.slice(0, 5).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.moduleName}`);
      console.log(`      Course: ${result.courseName}`);
      console.log(`      Type: ${result.type}`);
    });
    if (searchResults.length > 5) {
      console.log(`   ... and ${searchResults.length - 5} more`);
    }
    console.log();

    // Test 6: Verify Download URLs in Course Documents
    console.log(`📝 Test 6: Verify Download URLs`);
    console.log(`Getting documents with download URLs from: "${testCourse.fullname}"`);
    const courseDocuments = await client.getCourseDocuments(testCourse.id);
    console.log(`✅ Found ${courseDocuments.length} modules with files`);
    if (courseDocuments.length > 0 && courseDocuments[0].files.length > 0) {
      const firstDoc = courseDocuments[0];
      const firstFile = firstDoc.files[0];
      console.log(`   Module: ${firstDoc.moduleName}`);
      console.log(`   File: ${firstFile.filename}`);
      console.log(`   Download URL includes token: ${firstFile.downloadUrl.includes('token=') ? 'Yes' : 'No'}`);
    } else {
      console.log(`   No files available`);
    }
    console.log();

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
