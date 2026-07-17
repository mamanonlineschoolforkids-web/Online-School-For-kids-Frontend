import api from './api';

// ── Types ────────────────────────────────────────────────────────────────────

// Matches the backend's EventType enum
export type BackendEventType =
  | 'LiveSession' | 'Assignment' | 'StudyGroup' | 'Webinar' | 'Exam' | 'Deadline' | 'Other';

export interface EventDto {
  id: string;
  title: string;
  description?: string | null;
  type: BackendEventType;
  courseName?: string | null;
  instructorName?: string | null;
  startDateTime: string;
  endDateTime?: string | null;
  duration: number; // minutes
  meetingUrl?: string | null;
  color: string;
  attendeesCount: number;
  isUserRegistered: boolean;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  type: BackendEventType;
  courseId?: string;
  startDateTime: string; // ISO
  duration: number; // minutes
  meetingUrl?: string;
  maxAttendees?: number;
}

export interface UpdateEventRequest {
  title: string;
  description?: string;
  startDateTime: string; // ISO
  duration: number;
  meetingUrl?: string;
}

export interface UpcomingEventDto {
  id: string;
  title: string;
  type: BackendEventType;
  typeIcon: string;
  date: string;
  time: string;
  instructorName?: string | null;
  attendeesCount: number;
  color: string;
  canJoin: boolean;
  canView: boolean;
}

export interface CalendarDayDto {
  day: number;
  isToday: boolean;
  hasEvents: boolean;
  eventCount: number;
  events: EventDto[];
}

export interface CalendarMonthDto {
  year: number;
  month: number;
  monthName: string;
  days: CalendarDayDto[];
  eventsThisWeek: number;
  deadlinesThisWeek: number;
}

export interface CalendarStatsDto {
  eventsThisWeek: number;
  deadlinesThisWeek: number;
  upcomingEvents: number;
}

export interface JoinEventResult {
  success: boolean;
  message: string;
  meetingUrl?: string | null;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const calendarService = {
  createEvent: async (dto: CreateEventRequest): Promise<EventDto> => {
    const res = await api.post('/Calendar/event', dto);
    return res.data.data as EventDto;
  },

  updateEvent: async (eventId: string, dto: UpdateEventRequest): Promise<void> => {
    await api.put(`/Calendar/event/${eventId}`, dto);
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    await api.delete(`/Calendar/event/${eventId}`);
  },

  joinEvent: async (eventId: string): Promise<JoinEventResult> => {
    const res = await api.post('/Calendar/join', { eventId });
    return {
      success: res.data.success,
      message: res.data.message,
      meetingUrl: res.data.data?.meetingUrl,
    };
  },

  getEvent: async (eventId: string): Promise<EventDto> => {
    const res = await api.get(`/Calendar/event/${eventId}`);
    return res.data.data as EventDto;
  },

  getUpcomingEvents: async (limit = 10): Promise<UpcomingEventDto[]> => {
    const res = await api.get('/Calendar/upcoming', { params: { limit } });
    return res.data.data as UpcomingEventDto[];
  },

  getCalendarMonth: async (year: number, month: number): Promise<CalendarMonthDto> => {
    const res = await api.get('/Calendar/month', { params: { year, month } });
    return res.data.data as CalendarMonthDto;
  },

  getStats: async (): Promise<CalendarStatsDto> => {
    const res = await api.get('/Calendar/stats');
    return res.data.data as CalendarStatsDto;
  },
};