import axios, { AxiosInstance } from 'axios';
import {
  MoodleConfig,
  TokenResponse,
  MoodleCourse,
  MoodleSection,
  MoodleError,
} from './types.js';

/**
 * Moodle API Client
 * Handles authentication and API calls to Moodle LMS
 */
export class MoodleClient {
  private baseUrl: string;
  private token: string | null = null;
  private axios: AxiosInstance;
  private username: string;
  private password: string;
  private service: string;

  constructor(config: MoodleConfig) {
    this.baseUrl = config.url.replace(/\/$/, ''); // Remove trailing slash
    this.username = config.username;
    this.password = config.password;
    this.service = config.service || 'moodle_mobile_app';

    this.axios = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Authenticate and get token
   */
  async authenticate(): Promise<string> {
    try {
      const params = new URLSearchParams({
        username: this.username,
        password: this.password,
        service: this.service,
      });

      const response = await this.axios.post<TokenResponse>(
        `${this.baseUrl}/login/token.php`,
        params.toString()
      );

      if (response.data.error) {
        throw new Error(`Moodle authentication error: ${response.data.error}`);
      }

      if (!response.data.token) {
        throw new Error('No token received from Moodle');
      }

      this.token = response.data.token;
      return this.token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Authentication failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Ensure we have a valid token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.token) {
      await this.authenticate();
    }
  }

  /**
   * Call a Moodle web service function
   */
  private async callFunction<T>(
    wsfunction: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    await this.ensureAuthenticated();

    const searchParams = new URLSearchParams({
      wstoken: this.token!,
      wsfunction,
      moodlewsrestformat: 'json',
    });

    // Add function parameters
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            for (const [subKey, subValue] of Object.entries(item)) {
              searchParams.append(`${key}[${index}][${subKey}]`, String(subValue));
            }
          } else {
            searchParams.append(`${key}[${index}]`, String(item));
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        for (const [subKey, subValue] of Object.entries(value)) {
          searchParams.append(`${key}[${subKey}]`, String(subValue));
        }
      } else {
        searchParams.append(key, String(value));
      }
    }

    try {
      const response = await this.axios.get<T | MoodleError>(
        `${this.baseUrl}/webservice/rest/server.php?${searchParams.toString()}`
      );

      // Check for Moodle errors
      if (response.data && typeof response.data === 'object' && 'exception' in response.data) {
        const error = response.data as MoodleError;
        throw new Error(`Moodle API error: ${error.message || error.errorcode}`);
      }

      return response.data as T;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API call failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all courses the user is enrolled in
   */
  async getUserCourses(): Promise<MoodleCourse[]> {
    return this.callFunction<MoodleCourse[]>('core_enrol_get_users_courses', {
      userid: await this.getCurrentUserId(),
    });
  }

  /**
   * Get all available courses
   */
  async getAllCourses(): Promise<MoodleCourse[]> {
    return this.callFunction<MoodleCourse[]>('core_course_get_courses');
  }

  /**
   * Get course contents (sections, modules, resources)
   */
  async getCourseContents(courseId: number): Promise<MoodleSection[]> {
    return this.callFunction<MoodleSection[]>('core_course_get_contents', {
      courseid: courseId,
    });
  }

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<number> {
    const siteInfo = await this.callFunction<{ userid: number }>('core_webservice_get_site_info');
    return siteInfo.userid;
  }

  /**
   * Download file content from Moodle
   */
  async downloadFile(fileUrl: string): Promise<Buffer> {
    await this.ensureAuthenticated();

    try {
      // Add token to file URL
      const url = new URL(fileUrl);
      url.searchParams.set('token', this.token!);

      const response = await this.axios.get(url.toString(), {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`File download failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Search for resources by name across all courses
   */
  async searchResources(query: string): Promise<Array<{
    courseId: number;
    courseName: string;
    moduleName: string;
    moduleUrl: string;
    type: string;
    files?: Array<{
      filename: string;
      filesize: number;
      downloadUrl: string;
      mimetype?: string;
      timemodified: number;
    }>;
  }>> {
    await this.ensureAuthenticated();
    const courses = await this.getUserCourses();
    const results: Array<{
      courseId: number;
      courseName: string;
      moduleName: string;
      moduleUrl: string;
      type: string;
      files?: Array<{
        filename: string;
        filesize: number;
        downloadUrl: string;
        mimetype?: string;
        timemodified: number;
      }>;
    }> = [];

    const searchLower = query.toLowerCase();

    for (const course of courses) {
      try {
        const contents = await this.getCourseContents(course.id);

        for (const section of contents) {
          for (const module of section.modules) {
            if (module.name.toLowerCase().includes(searchLower)) {
              // Process files and add token to download URLs
              const files = module.contents?.map(content => {
                const url = new URL(content.fileurl);
                url.searchParams.set('token', this.token!);
                return {
                  filename: content.filename,
                  filesize: content.filesize,
                  downloadUrl: url.toString(),
                  mimetype: content.mimetype,
                  timemodified: content.timemodified,
                };
              });

              results.push({
                courseId: course.id,
                courseName: course.fullname,
                moduleName: module.name,
                moduleUrl: module.url,
                type: module.modname,
                files: files && files.length > 0 ? files : undefined,
              });
            }
          }
        }
      } catch (error) {
        // Skip courses we can't access
        continue;
      }
    }

    return results;
  }

  /**
   * Get all documents from a course with download URLs
   */
  async getCourseDocuments(courseId: number): Promise<Array<{
    sectionName: string;
    moduleName: string;
    moduleType: string;
    files: Array<{
      filename: string;
      filesize: number;
      downloadUrl: string;
      mimetype?: string;
      timemodified: number;
    }>;
  }>> {
    await this.ensureAuthenticated();
    const contents = await this.getCourseContents(courseId);
    const documents: Array<{
      sectionName: string;
      moduleName: string;
      moduleType: string;
      files: Array<{
        filename: string;
        filesize: number;
        downloadUrl: string;
        mimetype?: string;
        timemodified: number;
      }>;
    }> = [];

    for (const section of contents) {
      for (const module of section.modules) {
        if (module.contents && module.contents.length > 0) {
          documents.push({
            sectionName: section.name,
            moduleName: module.name,
            moduleType: module.modname,
            files: module.contents.map((content) => {
              const url = new URL(content.fileurl);
              url.searchParams.set('token', this.token!);
              return {
                filename: content.filename,
                filesize: content.filesize,
                downloadUrl: url.toString(),
                mimetype: content.mimetype,
                timemodified: content.timemodified,
              };
            }),
          });
        }
      }
    }

    return documents;
  }
}
