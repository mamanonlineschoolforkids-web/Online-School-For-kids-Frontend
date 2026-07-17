import api from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export type ReportableContentType = 'Course' | 'Comment' | 'Review' | 'Message' | 'Post' | 'PostComment';
export type ReportReason = 'Spam' | 'Harassment' | 'InappropriateContent' | 'Copyright' | 'Misinformation' | 'Other';
export type ModerationActionType = 'Dismissed' | 'Warned' | 'ContentRemoved' | 'UserBanned';

export interface ReportContentPayload {
  contentType: ReportableContentType;
  contentId: string;
  contentTitle: string;
  reason: ReportReason;
  description: string;
}

export interface PendingCourse {
  id: string;
  title: string;
  description: string;
  instructorName: string;
  category: string;
  thumbnailUrl: string;
  totalLessons: number;
  duration: string;
  submittedAt: string;
}

export interface ReportedContentItem {
  id: string;
  contentType: string;
  reason: string;
  reportCount: number;
  description: string;
  contentTitle: string;
  reportedByName: string;
  createdAt: string;
}

export interface FlaggedComment {
  id: string;
  userName: string;
  content: string;
  courseName: string;
  isFlagged: boolean;
  createdAt: string;
}

export interface ModerationStats {
  pendingCourses: number;
  reportedContent: number;
  flaggedComments: number;
  totalReportsToday: number;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const moderationService = {
  // Any signed-in user can report content
  reportContent: async (payload: ReportContentPayload): Promise<boolean> => {
    const res = await api.post('/report/content', payload);
    return res.data.success as boolean;
  },

  // Admin-only below

  getPendingCourses: async (): Promise<PendingCourse[]> => {
    const res = await api.get('/Moderation/pending-courses');
    return res.data.data;
  },

  getStats: async (): Promise<ModerationStats> => {
    const res = await api.get('/Moderation/stats');
    return res.data.data;
  },

  getReportedContent: async (): Promise<ReportedContentItem[]> => {
    const res = await api.get('/Moderation/reported-content');
    return res.data.data;
  },

  getFlaggedComments: async (): Promise<FlaggedComment[]> => {
    const res = await api.get('/Moderation/flagged-comments');
    return res.data.data;
  },

  approveCourse: async (courseId: string): Promise<void> => {
    await api.post('/Moderation/approve-course', { courseId });
  },

  rejectCourse: async (courseId: string, reason: string): Promise<void> => {
    await api.post('/Moderation/reject-course', { courseId, reason });
  },

  approveComment: async (commentId: string): Promise<void> => {
    await api.post('/Moderation/approve-comment', { commentId });
  },

  removeComment: async (commentId: string): Promise<void> => {
    await api.post('/Moderation/remove-comment', { commentId });
  },

  takeAction: async (reportId: string, action: ModerationActionType): Promise<void> => {
    await api.post('/Moderation/take-action', { reportId, action });
  },
};