import api from './api';

export interface AdminSecuritySettingsDto {
    readonly  twoFactorEnabled: boolean;   
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
}

export interface AdminActivityLogDto {
  id: string;
  action: string;
  target: string;
  targetType?: string;
  performedAt: string;
  ipAddress?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

  export interface CreateAdminData {
  fullName: string;
  email: string;
  password: string;
}

export interface CreatedAdminDto {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

//////////////////
export type UserRole   = 'Student' | 'Parent' | 'Creator' | 'Specialist' | 'Admin';
export type UserStatus = 'active' | 'pending' | 'suspended';

// ── List row ────────────────────────────────────────────────────────────────

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinedDate: string;
}

export interface SocialLink {
  id: string;
  name: string;
  value: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  isDefault: boolean;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  vodafoneNumber?: string;
  instapayId?: string;
  fawryReferenceNumber?: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  createdAt: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: number;
  documentUrl?: string;
}

export interface AvailabilitySlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface SessionRates {
  thirtyMinSession: number;
  sixtyMinSession: number;
  platformFeePercentage: number;
}

export interface WorkExperience {
  id: string;
  title: string;
  place: string;
  startDate: string;
  endDate?: string;
  isCurrentRole: boolean;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  details: string;
  targetType?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface NotificationPreferences {
  weeklyReports?: boolean;
  messages?: boolean;
  commentReplies?: boolean;
  progressUpdates?: boolean;
  achievementAlerts?: boolean;
  paymentReminders?: boolean;
  courseEnrollments?: boolean;
  newSessionBooking?: boolean;
  sessionCancellation?: boolean;
  sessionReminder?: boolean;
  reviewNotifications?: boolean;
  payoutAlerts?: boolean;
  accountLogin?: boolean;
  suspiciousActivity?: boolean;
}

export interface AdminUserDetailDto {
  // ── Base ──
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  joinedDate: string;
  lastLoginAt?: string;
  profilePictureUrl?: string;
  phone?: string;
  country?: string;
  bio?: string;
  dateOfBirth?: string;
  authProvider: string;
  isFirstLogin: boolean;

  // ── Shared creator/specialist registration ──
  portfolioUrl?: string;
  cvLink?: string;

  // ── Student / Parent ──
  parentId?: string;
  learningGoals?: string;
  enrolledCourseIds?: string[];
  achievementIds?: string[];
  totalHoursLearned?: number;
  courses: number;

  // ── Parent ──
  childrenIds?: string[];
  childInvitations?: string[];

  // ── Creator ──
  isVerifiedCreator?: boolean;
  expertiseTags?: string[];
  totalStudents?: number;
  totalRevenue?: number;
  averageRating?: number;
  createdCourseIds?: string[];
  socialLinks?: SocialLink[];
  workExperiences?: WorkExperience[];

  // ── Specialist ──
  professionalTitle?: string;
  certifications?: Certification[];
  yearsOfExperience?: number;
  availability?: AvailabilitySlot[];
  hourlyRate?: number;
  sessionRates?: SessionRates;

  // ── Admin ──
  isSuperAdmin?: boolean;
  twoFactorEnabled?: boolean;
  loginNotifications?: boolean;
  suspiciousActivityAlerts?: boolean;
  activityLog?: ActivityLogEntry[];

  // ── Shared nested ──
  notificationPreferences?: NotificationPreferences;
  paymentMethods?: PaymentMethod[];
}

// ── Paged list params/response ──────────────────────────────────────────────

export interface GetUsersParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  isSuperAdmin?: boolean;
}

export interface GetUsersResponse {
  users: AdminUserDto[];
  total: number;
  page: number;
  totalPages: number;
}

export interface BulkActionResponse {
  affected: number;
  message: string;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface MonthlyCount {
  month: string;
  value: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface CategoryEnrollment {
  name: string;
  enrollments: number;
}

export interface RoleDistributionItem {
  name: string;
  value: number;
}

export interface RecentTransaction {
  id: string;
  userName: string;
  courseName: string;
  amount: number;
  date: string;
  status: string;
}

export interface RecentRegistration {
  id: string;
  name: string;
  email: string;
  role: string;
  date: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalUsersChangePercent: number;
  activeUsers: number;
  activeUsersChangePercent: number;
  totalRevenue: number;
  totalRevenueChangePercent: number;
  totalCourses: number;
  totalCoursesChangePercent: number;
  pendingReviews: number;
  userRegistrations: MonthlyCount[];
  revenue: MonthlyRevenue[];
  enrollmentsByCategory: CategoryEnrollment[];
  roleDistribution: RoleDistributionItem[];
  recentTransactions: RecentTransaction[];
  recentRegistrations: RecentRegistration[];
}

// ── Service ──────────────────────

export const adminService = {

  getSecuritySettings: async (): Promise<AdminSecuritySettingsDto> => {
    const response = await api.get('/Admin/security-settings');
    return response.data;
  },

  updateSecuritySettings: async (data: AdminSecuritySettingsDto): Promise<AdminSecuritySettingsDto> => {
    const response = await api.put('/Admin/security-settings', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordDto): Promise<void> => {
    await api.put('/Admin/change-password', data);
  },

  getActivityLog: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{ activities: AdminActivityLogDto[]; total: number }> => {
    const response = await api.get('/Admin/activity-log', { params });
    return response.data;
  },


createAdmin: async (data: CreateAdminData): Promise<CreatedAdminDto> => {
  const response = await api.post('/Admin/create-admin', data);
  return response.data;
},


/////////////

/** GET /Admin/users */
  getUsers: async (params: GetUsersParams = {}): Promise<GetUsersResponse> => {
    const query: Record<string, any> = { page: params.page ?? 1, limit: params.limit ?? 5 };
    if (params.search)                            query.search       = params.search;
    if (params.role   && params.role   !== 'all') query.role         = params.role;
    if (params.status && params.status !== 'all') query.status       = params.status;
    if (params.isSuperAdmin !== undefined)        query.isSuperAdmin = params.isSuperAdmin;
    const response = await api.get('/Admin/users', { params: query });
    return response.data;
  },

  /** GET /Admin/users/:userId */
  getUserById: async (userId: string): Promise<AdminUserDetailDto> => {
    const response = await api.get(`/Admin/users/${userId}`);
    return response.data;
  },

  /** PUT /Admin/users/:userId/approve */
  approveUser: async (userId: string): Promise<AdminUserDto> => {
    const response = await api.put(`/Admin/users/${userId}/approve`);
    return response.data;
  },

  /** PUT /Admin/users/:userId/suspend */
  suspendUser: async (userId: string): Promise<AdminUserDto> => {
    const response = await api.put(`/Admin/users/${userId}/suspend`);
    return response.data;
  },

  /** DELETE /Admin/users/:userId */
  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/Admin/users/${userId}`);
  },

  /** POST /Admin/users/bulk/approve */
  bulkApprove: async (userIds: string[]): Promise<BulkActionResponse> => {
    const response = await api.post('/Admin/users/bulk/approve', { userIds });
    return response.data;
  },

  /** POST /Admin/users/bulk/suspend */
  bulkSuspend: async (userIds: string[]): Promise<BulkActionResponse> => {
    const response = await api.post('/Admin/users/bulk/suspend', { userIds });
    return response.data;
  },

  /** POST /Admin/users/bulk/delete */
  bulkDelete: async (userIds: string[]): Promise<BulkActionResponse> => {
    const response = await api.post('/Admin/users/bulk/delete', { userIds });
    return response.data;
  },

  /** PUT /Admin/users/:userId/change-password  (SuperAdmin only) */
  changeUserPassword: async (userId: string, newPassword: string): Promise<void> => {
    await api.put(`/Admin/users/${userId}/change-password`, { newPassword });
  },

  /** GET /Admin/dashboard-stats */
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const response = await api.get('/Admin/dashboard-stats');
    return response.data;
  },
}