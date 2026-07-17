import api from "./api";
import { QuizQuestionDraft } from "./courseService";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DraftQuizQuestion = QuizQuestionDraft;

export interface DraftQuizSet {
  difficulty: "easy" | "medium" | "hard";
  questions: DraftQuizQuestion[];
}

export interface VideoChunk {
  id: string;
  index: number;
  title: string;
  summary: string;
  transcript: string;
  startTime: string;
  endTime: string;
  isSaved: boolean;
  lessonId?: string | null;
  draftQuizzes: DraftQuizSet[];
}

export interface PipelineDescription {
  summary: string;
  targetAudience: string;
  toneAndStyle: string;
  seoTags: string[];
}

export interface VideoProcessingJob {
  id: string;
  courseId: string;
  sectionId: string;
  sourceType: "upload" | "youtube";
  mode: "chunked" | "single";
  sourceUrl: string;
  videoUrl?: string | null;
  status:
    | "pending"
    | "processing"
    | "awaiting_correction"
    | "awaiting_review"
    | "awaiting_quiz"
    | "completed"
    | "failed"
    | "expired";
  errorMessage?: string | null;
  rawTranscript?: string | null;
  correctedTranscript?: string | null;
  accuracyScore?: number | null;
  detectedLanguage?: string | null;
  isTranscriptApproved: boolean;
  description?: PipelineDescription | null;
  chunks: VideoChunk[];
}

export interface BoundaryAlignment {
  isAligned: boolean;
  nearestLineBefore?: string | null;
  nearestLineAfter?: string | null;
}

export interface UpdateChunkResult {
  transcript: string;
  needsTranscriptReview: boolean;
  startAlignment?: BoundaryAlignment | null;
  endAlignment?: BoundaryAlignment | null;
}

export interface CorrectTranscriptResult {
  correctedTranscript: string;
  accuracy: number;
  detectedLanguage: string;
  errors: string[];
  needsRevision: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const videoProcessingService = {
  // ── Starting a job (the 4 entry points) ───────────────────────────────────

  startChunkedFromYoutube: async (
    courseId: string,
    sectionId: string,
    youtubeUrl: string
  ): Promise<string> => {
    const res = await api.post("/videoprocessing/chunked/youtube", {
      courseId,
      sectionId,
      youtubeUrl,
    });
    return res.data.data.jobId as string;
  },

  startChunkedFromUpload: async (
    courseId: string,
    sectionId: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<string> => {
    const form = new FormData();
    form.append("courseId", courseId);
    form.append("sectionId", sectionId);
    form.append("file", file);
    const res = await api.post("/videoprocessing/chunked/upload", form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return res.data.data.jobId as string;
  },

  startSingleFromYoutube: async (
    courseId: string,
    sectionId: string,
    youtubeUrl: string
  ): Promise<string> => {
    const res = await api.post("/videoprocessing/single/youtube", {
      courseId,
      sectionId,
      youtubeUrl,
    });
    return res.data.data.jobId as string;
  },

  startSingleFromUpload: async (
    courseId: string,
    sectionId: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<string> => {
    const form = new FormData();
    form.append("courseId", courseId);
    form.append("sectionId", sectionId);
    form.append("file", file);
    const res = await api.post("/videoprocessing/single/upload", form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return res.data.data.jobId as string;
  },

  // ── Job retrieval ──────────────────────────────────────────────────────────

  getJob: async (jobId: string): Promise<VideoProcessingJob> => {
    const res = await api.get(`/videoprocessing/${jobId}`);
    return res.data.data as VideoProcessingJob;
  },

  // ── Transcript correction (runs once, pre-chunking) ─────────────────────────

  checkAccuracy: async (jobId: string): Promise<CorrectTranscriptResult> => {
    const res = await api.post(`/videoprocessing/${jobId}/correct-transcript`);
    return res.data.data as CorrectTranscriptResult;
  },

  approveTranscript: async (jobId: string, choice: "corrected" | "original"): Promise<void> => {
    await api.post(`/videoprocessing/${jobId}/approve-transcript`, { choice });
  },

  updateRawTranscript: async (jobId: string, transcript: string): Promise<void> => {
    await api.patch(`/videoprocessing/${jobId}/transcript`, { transcript });
  },

  // ── Chunk boundary / content editing ────────────────────────────────────────

  updateChunk: async (
    jobId: string,
    chunkId: string,
    changes: { title?: string; transcript?: string; startTime?: string; endTime?: string }
  ): Promise<UpdateChunkResult> => {
    const res = await api.patch(`/videoprocessing/${jobId}/chunks/${chunkId}`, changes);
    return res.data.data as UpdateChunkResult;
  },

  // ── Per-chunk quiz generation + editing ──────────────────────────────────────

  generateChunkQuiz: async (
    jobId: string,
    chunkId: string,
    numQuestions = 5
  ): Promise<DraftQuizSet[]> => {
    const res = await api.post(`/videoprocessing/${jobId}/chunks/${chunkId}/generate-quiz`, {
      numQuestions,
    });
    return res.data.data as DraftQuizSet[];
  },

  updateChunkQuizQuestions: async (
    jobId: string,
    chunkId: string,
    difficulty: string,
    questions: DraftQuizQuestion[]
  ): Promise<void> => {
    await api.put(`/videoprocessing/${jobId}/chunks/${chunkId}/quiz/${difficulty}`, questions);
  },

  // ── Final save: chunk → real Lesson ──────────────────────────────────────────

  saveChunkAsLesson: async (
  jobId: string,
  chunkId: string,
  payload: {
    title: string;
    transcript: string;
    order: number;
    isFree: boolean;
    duration: number;
    startTime?: string;
    endTime?: string;
  }
): Promise<string> => {
  const res = await api.post(`/videoprocessing/${jobId}/chunks/${chunkId}/save`, payload);
  return res.data.data.lessonId as string;
},
};