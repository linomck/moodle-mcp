/**
 * Moodle API Types
 */

export interface MoodleConfig {
  url: string;
  username: string;
  password: string;
  service?: string;
}

export interface TokenResponse {
  token?: string;
  privatetoken?: string;
  error?: string;
  errorcode?: string;
  stacktrace?: string;
  debuginfo?: string;
  reproductionlink?: string;
}

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  displayname?: string;
  enrolledusercount?: number;
  idnumber?: string;
  visible?: number;
  summary?: string;
  summaryformat?: number;
  format?: string;
  showgrades?: boolean;
  lang?: string;
  enablecompletion?: boolean;
  category?: number;
  progress?: number;
  completed?: boolean;
  startdate?: number;
  enddate?: number;
}

export interface MoodleModule {
  id: number;
  url: string;
  name: string;
  instance?: number;
  contextid?: number;
  visible?: number;
  uservisible?: boolean;
  availabilityinfo?: string;
  visibleoncoursepage?: number;
  modicon: string;
  modname: string;
  modplural: string;
  availability?: string;
  indent?: number;
  onclick?: string;
  afterlink?: string;
  customdata?: string;
  noviewlink?: boolean;
  completion?: number;
  completiondata?: {
    state: number;
    timecompleted: number;
    overrideby: number;
    valueused: boolean;
  };
  contents?: MoodleContent[];
  contentsinfo?: {
    filescount: number;
    filessize: number;
    lastmodified: number;
    mimetypes: string[];
    repositorytype?: string;
  };
}

export interface MoodleContent {
  type: string;
  filename: string;
  filepath?: string;
  filesize: number;
  fileurl: string;
  content?: string;
  timecreated: number;
  timemodified: number;
  sortorder?: number;
  mimetype?: string;
  isexternalfile?: boolean;
  repositorytype?: string;
  userid?: number;
  author?: string;
  license?: string;
}

export interface MoodleSection {
  id: number;
  name: string;
  visible?: number;
  summary: string;
  summaryformat: number;
  section?: number;
  hiddenbynumsections?: number;
  uservisible?: boolean;
  availabilityinfo?: string;
  modules: MoodleModule[];
}

export interface MoodleError {
  exception?: string;
  errorcode?: string;
  message?: string;
  debuginfo?: string;
}
