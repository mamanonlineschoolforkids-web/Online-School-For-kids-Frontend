import api from "./api";

export type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";
export type Visibility   = "public" | "private";

export interface PostAuthor {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  isFollowedByViewer: boolean;
  isFollowedByFollowing: boolean;
  followedByName?: string | null;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  mediaType: string;
  visibility: Visibility;
  commentsCount: number;
  sharesCount: number;
  totalReactions: number;
  reactionCounts: Record<string, number>;
  userReaction: ReactionType | null;
  createdAt: string;
  updatedAt?: string;
  author?: PostAuthor;
  feedSection: "following" | "fof" | "public" | "profile";
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author?: PostAuthor;
}

export interface FeedResult {
  followingPosts: Post[];
  fofPosts: Post[];
  publicPosts: Post[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ReactResponse {
  userReaction: ReactionType | null;
  reactionCounts: Record<string, number>;
  totalReactions: number;
}

export interface FollowResponse {
  isFollowing: boolean;
  followersCount: number;
}

export interface UserFollowStats {
  followersCount: number;
  followingCount: number;
  isFollowedByViewer: boolean;
}

export interface UploadResponse {
  url: string;
  mediaType: "image" | "video";
}

export const feedApi = {
  getFeed: async (page = 1, pageSize = 10): Promise<FeedResult> => {
    const { data } = await api.get("/feed", { params: { page, pageSize } });
    return data;
  },

  createPost: async (payload: {
    content: string;
    mediaUrls?: string[];
    mediaType?: string;
    visibility?: Visibility;
  }): Promise<Post> => {
    const { data } = await api.post("/feed", payload);
    return data;
  },

  // ── Update ──────────────────────────────────────────────────────────────────
  updatePost: async (
    postId: string,
    payload: { content?: string; visibility?: Visibility; mediaUrls?: string[]; mediaType?: string }
  ): Promise<Post> => {
    const { data } = await api.put(`/feed/${postId}`, payload);
    return data;
  },

  deletePost: async (postId: string): Promise<void> => {
    await api.delete(`/feed/${postId}`);
  },

  react: async (postId: string, reactionType: ReactionType | null): Promise<ReactResponse> => {
    const { data } = await api.post(`/feed/${postId}/react`, { reactionType });
    return data;
  },

  getComments: async (postId: string): Promise<PostComment[]> => {
    const { data } = await api.get(`/feed/${postId}/comments`);
    return data;
  },

  addComment: async (postId: string, content: string): Promise<PostComment> => {
    const { data } = await api.post(`/feed/${postId}/comments`, { content });
    return data;
  },

  trackShare: async (postId: string): Promise<void> => {
    await api.post(`/feed/${postId}/share`);
  },

  uploadMedia: async (file: File): Promise<UploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post("/upload/feed-media", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  // ── Follow ──────────────────────────────────────────────────────────────────
  toggleFollow: async (userId: string): Promise<FollowResponse> => {
    const { data } = await api.post(`/feed/follow/${userId}`);
    return data;
  },

  getFollowStats: async (userId: string): Promise<UserFollowStats> => {
    const { data } = await api.get(`/feed/follow-stats/${userId}`);
    return data;
  },

  getUserPosts: async (userId: string, page = 1, pageSize = 10): Promise<Post[]> => {
    const { data } = await api.get(`/feed/user/${userId}/posts`, { params: { page, pageSize } });
    return data;
  },
};

// ── Social share helpers ──────────────────────────────────────────────────────

export type SocialPlatform = "whatsapp" | "facebook" | "linkedin" | "instagram" | "copy";

export function buildShareUrl(platform: SocialPlatform, post: Post, pageUrl: string): string {
  const text = encodeURIComponent(post.content.slice(0, 200));
  const url  = encodeURIComponent(pageUrl);
  switch (platform) {
    case "whatsapp":  return `https://wa.me/?text=${text}%20${url}`;
    case "facebook":  return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    case "linkedin":  return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case "instagram": return `https://www.instagram.com/`;
    default:          return "";
  }
}

export async function shareToSocial(
  platform: SocialPlatform,
  post: Post,
  pageUrl: string,
  onCopied?: () => void
): Promise<void> {
  if (platform === "copy") {
    await navigator.clipboard.writeText(`${post.content.slice(0, 120)}… ${pageUrl}`);
    onCopied?.();
    return;
  }
  const url = buildShareUrl(platform, post, pageUrl);
  if (url) window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
}