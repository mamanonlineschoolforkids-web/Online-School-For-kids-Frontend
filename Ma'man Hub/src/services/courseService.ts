import api from './api';

// ════════════════════════════════════════════════════════════════════════════
// Age group types
// ════════════════════════════════════════════════════════════════════════════

export type AgeGroup =
  | 'ForParents'
  | 'ForEducators'
  | 'Toddlers'
  | 'Preschool'
  | 'EarlyPrimary'
  | 'LatePrimary'
  | 'Tweens'
  | 'Teenagers';

export const AGE_GROUP_FROM_INT: Record<number, AgeGroup> = {
  0: 'ForParents',
  1: 'ForEducators',
  2: 'Toddlers',
  3: 'Preschool',
  4: 'EarlyPrimary',
  5: 'LatePrimary',
  6: 'Tweens',
  7: 'Teenagers',
};

export interface AgeGroupMeta {
  value:       AgeGroup;
  label:       string;
  ageRange:    string;
  color:       string;
  textColor:   string;
  borderColor: string;
}

export const AGE_GROUPS: AgeGroupMeta[] = [
  { value: 'ForParents',   label: 'For Parents',   ageRange: 'All ages',  color: 'bg-rose-100',   textColor: 'text-rose-700',   borderColor: 'border-rose-300'   },
  { value: 'ForEducators', label: 'For Educators', ageRange: 'All ages',  color: 'bg-violet-100', textColor: 'text-violet-700', borderColor: 'border-violet-300' },
  { value: 'Toddlers',     label: 'Toddlers',      ageRange: '1–3 yrs',   color: 'bg-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-300' },
  { value: 'Preschool',    label: 'Preschool',     ageRange: '3–5 yrs',   color: 'bg-green-100',  textColor: 'text-green-700',  borderColor: 'border-green-300'  },
  { value: 'EarlyPrimary', label: 'Early Primary', ageRange: '5–8 yrs',   color: 'bg-blue-100',   textColor: 'text-blue-700',   borderColor: 'border-blue-300'   },
  { value: 'LatePrimary',  label: 'Late Primary',  ageRange: '8–12 yrs',  color: 'bg-cyan-100',   textColor: 'text-cyan-700',   borderColor: 'border-cyan-300'   },
  { value: 'Tweens',       label: 'Tweens',        ageRange: '10–13 yrs', color: 'bg-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-300' },
  { value: 'Teenagers',    label: 'Teenagers',     ageRange: '13–18 yrs', color: 'bg-indigo-100', textColor: 'text-indigo-700', borderColor: 'border-indigo-300' },
];

export function getAgeGroupMeta(value: AgeGroup): AgeGroupMeta {
  return AGE_GROUPS.find(g => g.value === value) ?? AGE_GROUPS[0];
}

export function resolveAgeGroup(value: AgeGroup | number | string): AgeGroup | null {
  if (typeof value === 'number') return AGE_GROUP_FROM_INT[value] ?? null;
  const known = Object.values(AGE_GROUP_FROM_INT);
  return known.includes(value as AgeGroup) ? (value as AgeGroup) : null;
}

// ════════════════════════════════════════════════════════════════════════════
// CourseDto — matches backend GetCoursesDto exactly (catalog / browsing)
// ════════════════════════════════════════════════════════════════════════════

export interface CourseDto {
  id:                   string;
  title:                string;
  instructorId:         string;
  instructorName:       string;
  instructorAvatarUrl?: string;
  categoryId:           string;
  categoryName:         string;
  ageGroup:             number;
  price:                number;
  discountPrice?:       number | null;
  rating:               number;
  totalStudents:        number;
  durationHours:        number;
  thumbnailUrl:         string;
  language:             string;
  lastUpdated?:         string;
  isInWishlist:         boolean;
  isInCart:             boolean;
}

// ── Paging ────────────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  items:           T[];
  totalCount:      number;
  page:            number;
  pageSize:        number;
  totalPages:      number;
  hasPreviousPage: boolean;
  hasNextPage:     boolean;
}

export interface GetCoursesParams {
  categoryId?:  string;
  ageGroup?:    AgeGroup;
  minPrice?:    number;
  maxPrice?:    number;
  minRating?:   number;
  language?:    string;
  searchQuery?: string;
  sortBy?:      string;
  sortOrder?:   string;
  page?:        number;
  pageSize?:    number;
}

export interface ApiResponse<T> {
  data:    T;
  success: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// Course-creator types (sections, lessons, materials, management)
// ════════════════════════════════════════════════════════════════════════════

// ── Shared quiz question shape ──────────────────────────────────────────────
// Used both for saved-lesson quizzes (read/write via this service) and for
// job-draft quizzes (read/write via videoProcessingService, which imports
// this same type rather than redefining it).

export interface QuizQuestionDraft {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface CreateCourseDto {
  title: string;
  subtitle?: string | null;
  description: string;
  categoryId: string;
  ageGroup: string;
  language: string;
  price: number;
  discountPrice?: number | null;
  thumbnailUrl?: string | null;
  previewVideoUrl?: string | null;
  whatYoullLearn: string[];
  requirements: string[];
}

export interface UpdateCourseDto {
  title: string;
  description: string;
  categoryId: string;
  ageGroup: string;
  language: string;
  price: number;
  discountPrice?: number | null;
  thumbnailUrl?: string | null;
  previewVideoUrl?: string | null;
  subtitle?: string | null;
  whatYoullLearn: string[];
  requirements: string[];
  isPublished: boolean;
}

export interface CourseCreatorDto {
  id: string;
  title: string;
  description: string;
  subtitle?: string | null;
  thumbnailUrl: string;
  previewVideoUrl?: string | null;
  language: string;
  price: number;
  discountPrice?: number | null;
  whatYoullLearn: string[];
  requirements: string[];
  isPublished: boolean;
  totalSections: number;
  totalLessons: number;
  totalStudents: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface MyCourseDto {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  isPublished: boolean;
  price: number;
  totalSections: number;
  totalLessons: number;
  totalStudents: number;
  rating: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface MaterialDto {
  id: string;
  title: string;
  type: string;
  url: string;
  fileSize: number;
}

export interface LessonQuizDto {
  difficulty: string;
  questions: QuizQuestionDraft[];
}

export interface ManagementLessonDto {
  id: string;
  title: string;
  duration: number;
  order: number;
  isFree: boolean;
  isPublished: boolean;
  hasVideo: boolean;
  videoUrl?: string | null;
  transcript?: string | null;
  hasQuiz: boolean;
  /// Full quiz content per difficulty (not just which levels exist) — lets
  /// the lesson editor load and edit existing questions for real.
  quizzes: LessonQuizDto[];
  materials: MaterialDto[];
}

export interface ManagementSectionDto {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  lessons: ManagementLessonDto[];
}

export interface CourseManagementDetailDto {
  id: string;
  title: string;
  description: string;
  subtitle?: string | null;
  categoryId: string;
  thumbnailUrl: string;
  previewVideoUrl?: string | null;
  price: number;
  discountPrice?: number | null;
  ageGroup: string;
  language: string;
  whatYoullLearn: string[];
  requirements: string[];
  isPublished: boolean;
  rating: number;
  totalStudents: number;
  totalSections: number;
  totalLessons: number;
  createdAt: string;
  updatedAt: string | null;
  sections: ManagementSectionDto[];
}

export interface CreateSectionDto {
  courseId: string;
  title: string;
  description?: string;
  order: number;
}

export interface UpdateSectionDto {
  title: string;
  description?: string;
  order: number;
}

export interface CreateLessonDto {
  courseId: string;
  sectionId: string;
  title: string;
  description?: string;
  duration: number;
  order: number;
  videoUrl?: string;
  isFree: boolean;
}

export interface UpdateLessonDto {
  title: string;
  description?: string;
  duration: number;
  order: number;
  videoUrl?: string;
  isFree: boolean;
}

export interface AddMaterialDto {
  courseId: string;
  sectionId: string;
  lessonId: string;
  title: string;
  type: string;
  url: string;
  fileSize: number;
}

export interface UpdateMaterialDto {
  courseId: string;
  sectionId: string;
  lessonId: string;
  materialId: string;
  title: string;
  type: string;
  url?: string;
  fileSize?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// Service
// ════════════════════════════════════════════════════════════════════════════

export const courseService = {
  // ── Catalog / browsing ───────────────────────────────────────────────────

  getCourses: async (params: GetCoursesParams = {}): Promise<PagedResult<CourseDto>> => {
    const {
      categoryId, ageGroup, minPrice, maxPrice, minRating,
      language, searchQuery,
      sortBy = 'relevance', sortOrder = 'desc',
      page = 1, pageSize = 12,
    } = params;

    const q = new URLSearchParams();

    if (categoryId) q.set('categoryId', categoryId);

    if (ageGroup) {
      const intVal = Object.entries(AGE_GROUP_FROM_INT)
        .find(([, v]) => v === ageGroup)?.[0];
      if (intVal != null) q.set('ageGroup', intVal);
    }

    if (minPrice != null)  q.set('minPrice',    String(minPrice));
    if (maxPrice != null)  q.set('maxPrice',    String(maxPrice));
    if (minRating != null) q.set('minRating',   String(minRating));
    if (language)          q.set('language',    language);
    if (searchQuery)       q.set('searchQuery', searchQuery);

    q.set('sortBy',    sortBy);
    q.set('sortOrder', sortOrder);
    q.set('page',      String(page));
    q.set('pageSize',  String(pageSize));

    const res = await api.get<ApiResponse<PagedResult<CourseDto>>>(`/Course?${q.toString()}`);
    return res.data.data;
  },

  getCourseById: async (id: string): Promise<CourseDto> => {
    const res = await api.get<ApiResponse<CourseDto>>(`/Course/${id}`);
    return res.data.data;
  },

  // ── Courses (creator) ────────────────────────────────────────────────────

  createCourse: async (dto: CreateCourseDto): Promise<CourseCreatorDto> => {
    const res = await api.post("/coursecreator/courses", dto);
    return res.data.data as CourseCreatorDto;
  },

  updateCourse: async (courseId: string, dto: UpdateCourseDto): Promise<void> => {
    await api.put(`/coursecreator/courses/${courseId}`, dto);
  },

  deleteCourse: async (courseId: string): Promise<void> => {
    await api.delete(`/coursecreator/courses/${courseId}`);
  },

  publishCourse: async (courseId: string, publish: boolean): Promise<void> => {
    await api.post(`/coursecreator/courses/${courseId}/publish`, { publish });
  },

  getMyCourses: async (params?: { search?: string; status?: string }): Promise<MyCourseDto[]> => {
    const res = await api.get("/coursecreator/courses/mine", { params });
    return res.data.data as MyCourseDto[];
  },

  getCourseManagementDetail: async (courseId: string): Promise<CourseManagementDetailDto> => {
    const res = await api.get(`/coursecreator/courses/${courseId}/management`);
    return res.data.data as CourseManagementDetailDto;
  },

  // ── Media uploads ────────────────────────────────────────────────────────

  uploadThumbnail: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/upload/course-thumbnail", form);
    return res.data.url as string;
  },

  uploadPreviewVideo: async (
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/upload/course-preview-video", form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return res.data.url as string;
  },

  uploadMaterialFile: async (file: File): Promise<{ url: string; fileName: string }> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/upload/course-material", form);
    return { url: res.data?.url ?? "", fileName: res.data?.fileName ?? file.name };
  },

  // ── Sections ─────────────────────────────────────────────────────────────

  createSection: async (dto: CreateSectionDto): Promise<void> => {
    await api.post("/coursecreator/sections", dto);
  },

  updateSection: async (courseId: string, sectionId: string, dto: UpdateSectionDto): Promise<void> => {
    await api.put(`/coursecreator/sections/${courseId}/${sectionId}`, dto);
  },

  deleteSection: async (courseId: string, sectionId: string): Promise<void> => {
    await api.delete(`/coursecreator/sections/${courseId}/${sectionId}`);
  },

  // ── Lessons ──────────────────────────────────────────────────────────────

  createLesson: async (dto: CreateLessonDto): Promise<string> => {
    const res = await api.post("/coursecreator/lessons", dto);
    return res.data.data?.lessonId as string;
  },

  updateLesson: async (
    courseId: string,
    sectionId: string,
    lessonId: string,
    dto: UpdateLessonDto
  ): Promise<void> => {
    await api.put(`/coursecreator/lessons/${courseId}/${sectionId}/${lessonId}`, dto);
  },

  deleteLesson: async (courseId: string, sectionId: string, lessonId: string): Promise<void> => {
    await api.delete(`/coursecreator/lessons/${courseId}/${sectionId}/${lessonId}`);
  },

  updateLessonQuiz: async (
    courseId: string,
    sectionId: string,
    lessonId: string,
    difficulty: string,
    questions: QuizQuestionDraft[]
  ): Promise<void> => {
    await api.put(
      `/coursecreator/lessons/${courseId}/${sectionId}/${lessonId}/quiz/${difficulty}`,
      questions
    );
  },

  // ── Materials ────────────────────────────────────────────────────────────

  addMaterial: async (dto: AddMaterialDto): Promise<string> => {
    const res = await api.post("/coursecreator/materials", dto);
    return res.data.data?.materialId as string;
  },

  updateMaterial: async (dto: UpdateMaterialDto): Promise<void> => {
    await api.put("/coursecreator/materials", dto);
  },

  deleteMaterial: async (
    courseId: string,
    sectionId: string,
    lessonId: string,
    materialId: string
  ): Promise<void> => {
    await api.delete(`/coursecreator/materials/${courseId}/${sectionId}/${lessonId}/${materialId}`);
  },
};