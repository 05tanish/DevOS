export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  logoUrl?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  backupEmail?: string;
  socialLinks?: Record<string, string>;
  notifEmail: boolean;
  notifTelegram: boolean;
  telegramChatId?: string;
  reminderTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  profile: UserProfile | null;
}

// ─── DSA ─────────────────────────────────────────────────────────────────────
export type DsaDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type DsaPlatform = 'LEETCODE' | 'GFG' | 'CODEFORCES' | 'CODECHEF' | 'HACKERRANK';
export type DsaTopic =
  | 'ARRAYS' | 'STRINGS' | 'HASHING' | 'LINKED_LIST' | 'STACK' | 'QUEUE'
  | 'TREE' | 'BST' | 'HEAP' | 'GRAPH' | 'DP' | 'GREEDY' | 'BACKTRACKING'
  | 'TRIE' | 'SEGMENT_TREE' | 'BINARY_SEARCH' | 'SLIDING_WINDOW' | 'TWO_POINTERS';

export interface DsaRevision {
  id: string;
  problemId: string;
  dueDate: string;
  completedAt: string | null;
  dayInterval: number;
  createdAt: string;
}

export interface DsaProblem {
  id: string;
  userId: string;
  name: string;
  difficulty: DsaDifficulty;
  platform: DsaPlatform;
  problemUrl?: string;
  solutionUrl?: string;
  code?: string;
  videoLinks: string[];
  notes?: string;
  tags: string[];
  topics: DsaTopic[];
  personalRating?: number;
  timeTaken?: number;
  mistakes?: string;
  solvedAt: string;
  createdAt: string;
  updatedAt: string;
  revisions: DsaRevision[];
}

// ─── DSA Concepts ────────────────────────────────────────────────────────────
export type DsaConceptCategory =
  | 'Arrays' | 'Strings' | 'STL' | 'Trees' | 'Graphs' | 'DP'
  | 'Bit Manipulation' | 'Math' | 'Sliding Window' | 'Binary Search'
  | 'Linked List' | 'Stack' | 'Queue' | 'Heap' | 'Trie'
  | 'Backtracking' | 'Greedy' | 'Hashing' | 'Recursion' | 'Sorting'
  | 'Two Pointers' | 'Other';

export type DsaConceptLanguage = 'C++' | 'Java' | 'Python' | 'JavaScript';

export interface DsaConcept {
  id: string;
  userId: string;
  topic: string;
  category: string;
  shortDescription?: string;
  detailedNotes?: string;
  codeSnippet?: string;
  language: string;
  leetcodeUrl?: string;
  gfgUrl?: string;
  codeforcesUrl?: string;
  youtubeUrl?: string;
  referenceLinks: string[];
  tags: string[];
  difficulty: DsaDifficulty;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskScope = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  scope: TaskScope;
  category?: string;
  dueDate?: string;
  reminderAt?: string;
  isRecurring: boolean;
  recurrRule?: string;
  estimatedTime?: number;
  actualTime?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Notes ───────────────────────────────────────────────────────────────────
export interface NoteTag { id: string; noteId: string; tag: string; }
export interface NoteAttachment {
  id: string; noteId: string; url: string;
  filename: string; mimeType: string; size: number; createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category?: string;
  folderPath?: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  tags: NoteTag[];
  attachments: NoteAttachment[];
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export type JobStatus = 'WISHLIST' | 'APPLIED' | 'OA' | 'INTERVIEW' | 'REJECTED' | 'OFFER' | 'SELECTED';
export type ExtractionStatus = 'MANUAL' | 'PENDING' | 'DOM_EXTRACTED' | 'AI_EXTRACTED' | 'NEEDS_REVIEW' | 'MANUALLY_COMPLETED';

export interface Job {
  id: string;
  userId: string;
  company: string;
  role: string;
  jobUrl?: string;
  status: JobStatus;
  appliedDate: string;
  location?: string;
  salary?: string;
  notes?: string;
  resumeFileName?: string;
  resumePath?: string;
  resumeSize?: number;
  resumeUploadedAt?: string;
  resumeId?: string;
  resume?: { id: string; name: string; fileUrl: string; fileName: string; fileSize?: number; mimeType?: string; isDefault: boolean };
  // Job Capture Extension fields
  description?: string;
  employmentType?: string;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  education?: string[];
  source?: string;
  sourceUrl?: string;
  screenshotUrl?: string;
  extractionStatus?: ExtractionStatus;
  extractionMethod?: string;
  extractionError?: string;
  extractionConfidence?: number;
  capturedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Learning ─────────────────────────────────────────────────────────────────
export type LearningCategory = 'BACKEND' | 'DEVOPS' | 'BLOCKCHAIN' | 'AUTOMATION' | 'SYSTEM_DESIGN' | 'AI';
export type LearningResourceType = 'NOTE' | 'VIDEO' | 'ARTICLE' | 'PDF' | 'IMAGE' | 'CHEAT_SHEET' | 'PROJECT' | 'ROADMAP';

export interface LearningEntry {
  id: string;
  userId: string;
  title: string;
  category: LearningCategory;
  type: LearningResourceType;
  content?: string;
  url?: string;
  fileUrl?: string;
  tags: string[];
  durationMin?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Resources ────────────────────────────────────────────────────────────────
export type ResourceType = 'YOUTUBE' | 'WEBSITE' | 'PDF' | 'IMAGE' | 'COURSE' | 'PLAYLIST' | 'BLOG' | 'DOCUMENTATION' | 'CHEAT_SHEET';

export interface ResourceFolder {
  id: string; userId: string; name: string; parentId?: string; createdAt: string;
}

export interface Resource {
  id: string;
  userId: string;
  title: string;
  type: ResourceType;
  url?: string;
  fileUrl?: string;
  folderId?: string;
  tags: string[];
  description?: string;
  status: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  folder?: ResourceFolder;
}

// ─── Placement ────────────────────────────────────────────────────────────────
export type PlacementSection = 'DBMS' | 'OS' | 'CN' | 'OOP' | 'SYSTEM_DESIGN' | 'APTITUDE' | 'QUANT' | 'REASONING' | 'VERBAL' | 'HR' | 'INTERVIEW_EXPERIENCE';
export type PlacementResourceType = 'NOTE' | 'PDF' | 'IMAGE' | 'FLASHCARD' | 'IMPORTANT_QUESTION';

export interface PlacementNote {
  id: string;
  userId: string;
  section: PlacementSection;
  title: string;
  content?: string;
  type: PlacementResourceType;
  fileUrl?: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── College Placement ────────────────────────────────────────────────────────
export type PlacementStatus = 'APPLIED' | 'SHORTLISTED' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'OFFER_RECEIVED' | 'REJECTED' | 'ACCEPTED' | 'WITHDRAWN';

export interface CollegePlacement {
  id: string;
  userId: string;
  company: string;
  role: string;
  jobDescription?: string;
  location?: string;
  package?: string;
  status: PlacementStatus;
  applicationDate: string;
  interviewDate?: string;
  offerDate?: string;
  resumeFileName?: string;
  resumeFileUrl?: string;
  resumePublicId?: string;
  resumeFileSize?: number;
  resumeMimeType?: string;
  resumeUploadedAt?: string;
  notes?: string;
  rounds?: string[];
  skills?: string[];
  eligibilityCriteria?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollegePlacementStats {
  total: number;
  byStatus: Record<string, number>;
  withResume: number;
  upcomingInterviews: number;
}

// ─── Books ────────────────────────────────────────────────────────────────────
export type BookCategory = 'DSA' | 'BACKEND' | 'DEVOPS' | 'BLOCKCHAIN' | 'SYSTEM_DESIGN' | 'PRODUCTIVITY';
export type ReadingStatus = 'WANT_TO_READ' | 'READING' | 'COMPLETED' | 'PAUSED';

export interface Book {
  id: string;
  userId: string;
  title: string;
  author?: string;
  category: BookCategory;
  coverUrl?: string;
  fileUrl?: string;
  notes?: string;
  highlights?: string;
  totalPages?: number;
  currentPage: number;
  readingStatus: ReadingStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── GitHub ───────────────────────────────────────────────────────────────────
export interface GithubActivity {
  id: string;
  userId: string;
  date: string;
  commits: number;
  repositories: string[];
  features?: string;
  bugsFix?: string;
  upcomingWork?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GithubStreakStats {
  currentStreak: number;
  longestStreak: number;
  totalCommits: number;
  todayCommits: number;
  hasCommittedToday: boolean;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface AnalyticsSnapshot {
  id: string; userId: string; date: string;
  dsaSolved: number; revisionsCount: number; learningMinutes: number;
  githubCommits: number; tasksCompleted: number; jobsApplied: number;
  createdAt: string;
}

export interface ProductivityLog {
  id: string; userId: string; date: string;
  studyMinutes: number; codingMinutes: number;
  projectMinutes: number; readingMinutes: number;
  notes?: string; createdAt: string; updatedAt: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardLayout {
  id: string; userId: string; name: string;
  isDefault: boolean; layout: GridLayoutItem[]; widgets: WidgetConfig[];
  createdAt: string; updatedAt: string;
}

export interface GridLayoutItem {
  i: string; x: number; y: number; w: number; h: number;
  minW?: number; minH?: number;
}

export interface WidgetConfig {
  id: string; type: string; visible: boolean; config: Record<string, unknown>;
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// ─── Priorities ───────────────────────────────────────────────────────────────
export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PriorityStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface Priority {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category?: string;
  priorityLevel: PriorityLevel;
  status: PriorityStatus;
  estimatedTotalHours: number;
  hoursCompleted: number;
  dailyHoursAlloc: number;
  progress: number;
  deadline?: string;
  queuePosition: number;
  isActive: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  remainingHours?: number;
  remainingDays?: number;
  remainingWeeks?: number;
  estimatedFinishDate?: string;
}

export interface PriorityStats {
  activePriority: Priority | null;
  nextPriority: Priority | null;
  todayPlannedHours: number;
  totalRemainingHours: number;
  totalCompleted: number;
  totalInQueue: number;
  overallProgress: number;
  totalWeeksRemaining: number;
  estimatedFinishDate: string | null;
}

// ─── GeeksforGeeks Profile Stats ─────────────────────────────────────────────
export interface GfgProfileStats {
  username: string;
  displayName: string;
  avatar?: string;
  institution?: string | null;
  country?: string | null;
  totalSolved: number;
  totalActiveDays?: number;
  totalContests?: number;
  byDifficulty: {
    school: number;
    basic: number;
    easy: number;
    medium: number;
    hard: number;
  };
  topicAnalysis?: { topic: string; count: number }[];
  profileUrl: string;
}

