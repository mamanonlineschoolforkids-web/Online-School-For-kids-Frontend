import api from './api';
import { Achievement, Course } from './studentService';
import { NotificationPreferences } from './userService';

export enum ChildStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  EMAIL_NOT_VERIFIED = "email_not_verified",
}

export interface Child {
  id: string;
  name: string;
  age: number;
  avatar?: string;
  profilePictureUrl?: string;
  courses: number;
  status: ChildStatus
}

export interface ChildProfilePreview {
  id: string;
  fullName: string;
  email: string;
  age: number;
  profilePictureUrl?: string | null;
  isAlreadyLinked: boolean;
  currentParentId?: string | null;
}

export interface ChildOverview {
  id: string;
  name: string;
  age: number;
  avatarUrl?: string;
  coursesEnrolled: number;
  hoursThisWeek: number;
  overallProgress: number;
  streak: number;
  recentActivity?: string;
}

export interface ChildAchievement {
  childName: string;
  title: string;
  description: string;
  icon: string;
}

export interface ChildActivity {
  childName: string;
  description: string;
  date: string;
}

export interface ParentDashboardStats {
  children: ChildOverview[];
  /** Recharts-ready rows: {day: "Mon", [childId]: hours, ...} */
  weeklyHoursChartData: Record<string, string | number>[];
  recentAchievements: ChildAchievement[];
  recentActivity: ChildActivity[];
}

 export const parentService = {

 getLinkedChildren: async (): Promise<Child[]> => {
    const response = await api.get('/Parent/children');
    return response.data;
  },


  removeChild: async (childId: string): Promise<void> => {
    await api.delete(`/Parent/children/${childId}`);
  },

  searchChildByEmail: async (email: string): Promise<{
    exists: boolean;
    child?: ChildProfilePreview;
  }> => {
    const response = await api.get(`/Parent/search-child`, {
      params: { email }
    });
    return response.data;
  },

  sendChildLinkInvite: async (childId: string): Promise<void> => {
    await api.post(`/Parent/send-invite/${childId}`);
  },

  createAndLinkChild: async (childData: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    dateOfBirth: string;
    country: string;
  }): Promise<Child> => {
    const response = await api.post('/Parent/create-child', childData);
    return response.data;
  },

  getChildProgress: async (childId: string): Promise<any> => {
    const response = await api.get(`/Parent/children/${childId}/progress`);
    return response.data;
  },

  getDashboardStats: async (): Promise<ParentDashboardStats> => {
    const response = await api.get('/Parent/dashboard-stats');
    return response.data;
  },

async getChildNotificationPreferences(childId: string): Promise<NotificationPreferences> {
  try {
    const response = await api.get(`/parent/children/${childId}/notifications`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch child notification preferences:', error);
    // Return default preferences if fetch fails
    return {
      progressUpdates: true,
      weeklyReports: true,
      achievementAlerts: true,
      paymentReminders: true,
    };
  }
},


async updateChildNotificationPreferences(
  childId: string,
  preferences: NotificationPreferences
): Promise<void> {
  const response = await api.put(
    `/parent/children/${childId}/notifications`,
    preferences
  );
  return response.data;
}
,

}