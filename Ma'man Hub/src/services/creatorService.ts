import api from './api';



export interface CreatorCourse {
  id: string;
  title: string;
  thumbnail?: string;
  studentsCount: number;
  rating: number;
  category: string;
  isPublishedOnProfile: boolean;
}


export interface GetContentCreatorsParams {
  search?: string;
  expertiseTag?: string;
  sortBy?: "rating" | "students" | "courses" | "newest";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}
 
export interface ContentCreatorListItemDto {
  id: string;
  fullName: string;
  profilePictureUrl?: string | null;
  bio?: string | null;
  country?: string | null;
  expertiseTags: string[];
  averageRating: number;
  reviewsCount: number;
  studentsCount: number;
  coursesCount: number;
  isVerifiedCreator: boolean;
  portfolioUrl?: string | null;
}
 
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}
 

export const creatorService = {

  // Courses
  getCreatorCourses: async (): Promise<CreatorCourse[]> => {
    const response = await api.get('/ContentCreator/courses');
    return response.data;
  },

  toggleCourseProfileVisibility: async (
    courseId: string,
    isPublishedOnProfile: boolean
  ): Promise<void> => {
    await api.put(`/ContentCreator/courses/${courseId}/profile-visibility`, {
      isPublishedOnProfile,
    });
  },
async getContentCreators(
    params: GetContentCreatorsParams
  ): Promise<PagedResult<ContentCreatorListItemDto>> {
    const { data } = await api.get<PagedResult<ContentCreatorListItemDto>>(
      "/ContentCreator",
      { params }
    );
    return data;
  },
}