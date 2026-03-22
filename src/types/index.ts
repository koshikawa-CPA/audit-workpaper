export type UserRole = 'creator' | 'reviewer' | 'admin'

export type WorkpaperStatus = 'not_started' | 'in_progress' | 'pending_review' | 'completed'

export type ProjectStatus = 'active' | 'locked'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface AuditProject {
  id: string
  name: string
  description: string | null
  fiscal_year: string
  status: ProjectStatus
  locked_at: string | null
  locked_by: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Joined fields
  locked_by_profile?: Profile
  created_by_profile?: Profile
  workpapers_count?: number
  completed_count?: number
}

export interface Workpaper {
  id: string
  project_id: string
  title: string
  workpaper_number: string
  category: string | null
  content: Record<string, unknown> | null
  status: WorkpaperStatus
  assigned_creator: string | null
  assigned_reviewer: string | null
  creator_checked_at: string | null
  creator_checked_by: string | null
  reviewer_checked_at: string | null
  reviewer_checked_by: string | null
  creator_comment: string | null
  reviewer_comment: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Joined fields
  project?: AuditProject
  assigned_creator_profile?: Profile
  assigned_reviewer_profile?: Profile
  creator_checked_by_profile?: Profile
  reviewer_checked_by_profile?: Profile
  created_by_profile?: Profile
  files?: WorkpaperFile[]
}

export interface WorkpaperReference {
  id: string
  from_workpaper_id: string
  to_workpaper_id: string
  created_by: string
  created_at: string
  // Joined
  from_workpaper?: Pick<Workpaper, 'id' | 'title' | 'workpaper_number' | 'status'>
  to_workpaper?: Pick<Workpaper, 'id' | 'title' | 'workpaper_number' | 'status'>
}

export interface WorkpaperFile {
  id: string
  workpaper_id: string
  filename: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string
  created_at: string
  // Joined
  uploaded_by_profile?: Profile
}

export interface DashboardStats {
  total_workpapers: number
  not_started: number
  in_progress: number
  pending_review: number
  completed: number
  completion_rate: number
}

export interface ProjectProgress {
  project: AuditProject
  stats: DashboardStats
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Form types
export interface CreateWorkpaperInput {
  project_id: string
  title: string
  workpaper_number: string
  category?: string
  assigned_creator?: string
  assigned_reviewer?: string
}

export interface UpdateWorkpaperInput {
  title?: string
  workpaper_number?: string
  category?: string
  content?: Record<string, unknown>
  assigned_creator?: string
  assigned_reviewer?: string
  status?: WorkpaperStatus
}

export interface CreateProjectInput {
  name: string
  description?: string
  fiscal_year: string
}

export interface CheckInput {
  check_type: 'creator' | 'reviewer'
  comment?: string
}

// Status labels in Japanese
export const STATUS_LABELS: Record<WorkpaperStatus, string> = {
  not_started: '未着手',
  in_progress: '作成中',
  pending_review: '査閲待ち',
  completed: '完了',
}

// Role labels in Japanese
export const ROLE_LABELS: Record<UserRole, string> = {
  creator: '作成者',
  reviewer: '査閲者',
  admin: '管理者',
}

// Tab structure types for 3-layer OneNote-style navigation
export interface TabItem {
  id: string
  title: string
}

export interface TabConfig {
  layer1: TabItem[]
  layer2: Record<string, TabItem[]>   // key = l1_id
  layer3: Record<string, TabItem[]>   // key = `${l1_id}__${l2_id}`
}

// Status colors for badges
export const STATUS_COLORS: Record<WorkpaperStatus, string> = {
  not_started: 'gray',
  in_progress: 'blue',
  pending_review: 'yellow',
  completed: 'green',
}
