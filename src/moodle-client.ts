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
   * Get simplified course list (reduces token usage)
   */
  async getUserCoursesSimplified(): Promise<Array<{
    id: number;
    shortname: string;
    fullname: string;
    visible?: number;
    progress?: number;
    startdate?: number;
    enddate?: number;
  }>> {
    const courses = await this.getUserCourses();
    return courses.map(course => ({
      id: course.id,
      shortname: course.shortname,
      fullname: course.fullname,
      visible: course.visible,
      progress: course.progress,
      startdate: course.startdate,
      enddate: course.enddate,
    }));
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
   * Get simplified course contents (reduces token usage by removing large fields)
   */
  async getCourseContentsSimplified(courseId: number): Promise<Array<{
    id: number;
    name: string;
    visible?: number;
    modules: Array<{
      id: number;
      name: string;
      modname: string;
      url: string;
      visible?: number;
      hasContents: boolean;
      contentsCount?: number;
      contentsSize?: number;
    }>;
  }>> {
    const sections = await this.getCourseContents(courseId);
    return sections.map(section => ({
      id: section.id,
      name: section.name,
      visible: section.visible,
      modules: section.modules.map(module => ({
        id: module.id,
        name: module.name,
        modname: module.modname,
        url: module.url,
        visible: module.visible,
        hasContents: !!module.contents && module.contents.length > 0,
        contentsCount: module.contentsinfo?.filescount,
        contentsSize: module.contentsinfo?.filessize,
      })),
    }));
  }

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<number> {
    const siteInfo = await this.callFunction<{ userid: number }>('core_webservice_get_site_info');
    return siteInfo.userid;
  }

  /**
   * Search for files by filename across all courses
   */
  async searchFiles(query: string, limit: number = 50): Promise<Array<{
    courseId: number;
    courseName: string;
    sectionName: string;
    moduleName: string;
    moduleId: number;
    filename: string;
    filesize: number;
    fileurl: string;
    mimetype?: string;
  }>> {
    const courses = await this.getUserCourses();
    const results: Array<{
      courseId: number;
      courseName: string;
      sectionName: string;
      moduleName: string;
      moduleId: number;
      filename: string;
      filesize: number;
      fileurl: string;
      mimetype?: string;
    }> = [];

    const searchLower = query.toLowerCase();

    for (const course of courses) {
      if (results.length >= limit) {
        break;
      }

      try {
        const contents = await this.getCourseContents(course.id);

        for (const section of contents) {
          for (const module of section.modules) {
            if (module.contents && module.contents.length > 0) {
              for (const content of module.contents) {
                if (content.type === 'file' && content.filename.toLowerCase().includes(searchLower)) {
                  results.push({
                    courseId: course.id,
                    courseName: course.fullname,
                    sectionName: section.name,
                    moduleName: module.name,
                    moduleId: module.id,
                    filename: content.filename,
                    filesize: content.filesize,
                    fileurl: content.fileurl,
                    mimetype: content.mimetype,
                  });

                  if (results.length >= limit) {
                    break;
                  }
                }
              }
            }
            if (results.length >= limit) {
              break;
            }
          }
          if (results.length >= limit) {
            break;
          }
        }
      } catch (error) {
      }
    }

    return results;
  }

  /**
   * Search for resources by name across all courses
   */
  async searchResources(query: string, limit: number = 50): Promise<Array<{
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
      if (results.length >= limit) {
        break;
      }

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

              if (results.length >= limit) {
                break;
              }
            }
          }
          if (results.length >= limit) {
            break;
          }
        }
      } catch (error) {
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

  /**
   * Get file content from a download URL
   */
  async getFileContent(downloadUrl: string): Promise<{
    content: string;
    mimeType?: string;
  }> {
    try {
      const response = await this.axios.get(downloadUrl, {
        responseType: 'arraybuffer',
      });

      // Convert buffer to base64
      const content = Buffer.from(response.data).toString('base64');
      const mimeType = response.headers['content-type'];

      return {
        content,
        mimeType,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to download file: ${error.message}`);
      }
      throw error;
    }
  }
}
