import api from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CourseFilters {
  languages: string[];
  categories: { id: string; name: string }[];
  ageGroups: string[];
}

export interface CourseRecommendation {
  id: string;
  title: string;
  instructorName: string;
  thumbnailUrl: string;
  price: number;
  discountPrice?: number | null;
  rating: number;
  totalStudents: number;
  categoryName: string;
  language: string;
}

export interface QuizAttemptAnswer {
  questionIndex: number;
  selectedAnswer: number;
  isCorrect: boolean;
}

export interface QuizAttemptDto {
  id: string;
  lessonId: string;
  difficulty: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  completedAt: string;
  answers: QuizAttemptAnswer[];
}

export interface SaveQuizAttemptPayload {
  courseId: string;
  lessonId: string;
  difficulty: string;
  answers: QuizAttemptAnswer[];
}

export interface SaveQuizAttemptResult {
  attemptId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  pointsEarned: number;
  totalPoints: number;
}

export interface LessonProgressDto {
  lessonId: string;
  isCompleted: boolean;
  videoPosition: number;
  timeSpent: number;
}

export interface NoteDto {
  id: string;
  content: string;
  lessonId: string;
  courseId: string;
  videoTimestamp?: number;
  createdAt: string;
}

export interface CreateNotePayload {
  courseId: string;
  lessonId: string;
  content: string;
  videoTimestamp?: number;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  duration: number;
  order: number;
  isFree: boolean;
  isCompleted: boolean;
  videoUrl?: string;
  transcript?: string;
  startTime?: number; // seconds — clip start within videoUrl (0 = full video)
  endTime?: number;   // seconds — clip end within videoUrl (0 = full video, no trim)
  quizzes?: { difficulty: string; questionCount: number }[];   // was: { difficulty: string; questions: any[] }[]
  materials?: { id: string; title: string; url: string; type: string; fileSize: number }[];
}

export interface CurriculumSection {
  id: string;
  title: string;
  order: number;
  lessons: CurriculumLesson[];
}

export interface CourseCurriculum {
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  sections: CurriculumSection[];
}

export interface EnrolledCourse {
  id: string;
  courseId: string;
  title: string;
  thumbnailUrl: string;
  instructorName: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt?: string;
  rating: number;
  totalStudents: number;
}

export interface LessonQuizFull {
  difficulty: string;
  questions: {
    text: string;
    options: { id: string; text: string; order: number }[];
    correctAnswer: number;
    explanation?: string;
  }[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export const studentService = {
  // ── Filters ──────────────────────────────────────────────────────────────

  getCourseFilters: async (): Promise<CourseFilters> => {
    const res = await api.get("/course/filters");
    return res.data.data as CourseFilters;
  },

  // ── Recommendations ───────────────────────────────────────────────────────

  getRecommendations: async (
    courseId: string,
    topN = 5
  ): Promise<CourseRecommendation[]> => {
    const res = await api.get(`/course/${courseId}/recommendations`, {
      params: { topN },
    });
    return res.data.data as CourseRecommendation[];
  },

  // ── Enrollment ────────────────────────────────────────────────────────────

  getEnrolledCourses: async (): Promise<EnrolledCourse[]> => {
    const res = await api.get("/student/enrollments");
    return (res.data.data ?? res.data) as EnrolledCourse[];
  },

  // ── Curriculum (enrolled student view) ───────────────────────────────────

  getCourseCurriculum: async (courseId: string): Promise<CourseCurriculum> => {
    const res = await api.get(`/progress/Curriculum/${courseId}`);
    return res.data.data as CourseCurriculum;
  },

  // ── Lesson progress ───────────────────────────────────────────────────────

  getLessonProgress: async (
    courseId: string,
    lessonId: string
  ): Promise<LessonProgressDto> => {
    const res = await api.get(`/progress/${courseId}/${lessonId}`);
    return res.data.data as LessonProgressDto;
  },

  updateLessonProgress: async (payload: {
    courseId: string;
    lessonId: string;
    videoPosition: number;
    timeSpent: number;
  }): Promise<void> => {
    await api.post("/progress", payload);
  },

  markLessonComplete: async (payload: {
    courseId: string;
    lessonId: string;
  }): Promise<{ courseCompleted: boolean; courseProgress: number; pointsEarned: number; totalPoints: number }> => {
    const res = await api.post("/progress/complete", payload);
    return res.data.data;
  },

  // ── Notes ─────────────────────────────────────────────────────────────────

  createNote: async (payload: CreateNotePayload): Promise<NoteDto> => {
    const res = await api.post("/progress/notes", payload);
    return res.data.data as NoteDto;
  },

  // ── Bookmarks ─────────────────────────────────────────────────────────────

  toggleBookmark: async (payload: {
    courseId: string;
    lessonId: string;
  }): Promise<{ isBookmarked: boolean }> => {
    const res = await api.post("/progress/bookmark/toggle", payload);
    return res.data.data;
  },

  // ── Continue learning ──────────────────────────────────────────────────────

  getContinueLearning: async (
    courseId: string
  ): Promise<{ lessonId: string; sectionId: string; lessonTitle: string } | null> => {
    try {
      const res = await api.get(`/progress/continue/${courseId}`);
      return res.data.data;
    } catch {
      return null;
    }
  },

  // ── Quiz attempts ─────────────────────────────────────────────────────────

  saveQuizAttempt: async (
    payload: SaveQuizAttemptPayload
  ): Promise<SaveQuizAttemptResult> => {
    const res = await api.post("/progress/quiz-attempt", payload);
    return res.data.data as SaveQuizAttemptResult;
  },

  getLessonQuizAttempts: async (lessonId: string): Promise<QuizAttemptDto[]> => {
    const res = await api.get(`/progress/quiz-attempts/lesson/${lessonId}`);
    return res.data.data as QuizAttemptDto[];
  },

  getCourseQuizAttempts: async (courseId: string): Promise<QuizAttemptDto[]> => {
    const res = await api.get(`/progress/quiz-attempts/course/${courseId}`);
    return res.data.data as QuizAttemptDto[];
  },

  // ── Cart ──────────────────────────────────────────────────────────────────

  addToCart: async (courseId: string): Promise<void> => {
    await api.post("/cart/add", { courseId });
  },

  removeFromCart: async (courseId: string): Promise<void> => {
    await api.delete(`/cart/${courseId}`);
  },

  // ── Wishlist ──────────────────────────────────────────────────────────────

  toggleWishlist: async (courseId: string): Promise<{ isInWishlist: boolean }> => {
    const res = await api.post("/wishlist/toggle", { courseId });
    return res.data.data;
  },
  getLessonQuiz: async (
  courseId: string,
  lessonId: string
): Promise<LessonQuizFull[]> => {
  const res = await api.get(`/progress/quiz/${courseId}/${lessonId}`);
  return res.data.data as LessonQuizFull[];
},
 
};