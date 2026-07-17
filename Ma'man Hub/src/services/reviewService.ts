import api from './api';

export interface ReviewDto {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CreateReviewDto {
  rating: number;
  comment: string;
}

export interface PagedReviewsResult {
  items: ReviewDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const reviewService = {
  getReviews: async (page = 1, pageSize = 6): Promise<PagedReviewsResult> => {
    const { data } = await api.get('/Review', { params: { page, pageSize } });
    return data;
  },

  createReview: async (dto: CreateReviewDto): Promise<ReviewDto> => {
    const { data } = await api.post('/Review', dto);
    return data;
  },
};