import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, BookOpen,
  Loader2, AlertCircle, FileText, HelpCircle, Menu, X,
  Bookmark, BookmarkCheck, Plus, Clock, ChevronDown, ChevronUp,
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, Download, ArrowLeft,
  Trophy, Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "../../stores/authStore.ts";

import {
  studentService,
  CourseCurriculum,
  CurriculumLesson,
  CurriculumSection,
  NoteDto,
} from "@/services/studentService";
import { getMyStats } from "@/services/leaderboardService";
import { useQueryClient } from "@tanstack/react-query";
import { leaderboardKeys } from "@/services/useleaderboard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSeconds(s: number) {
  if (!s || s === 0) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatTimestamp(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Sub-component: sidebar section list ──────────────────────────────────────

function CourseSidebar({
  curriculum,
  currentLessonId,
  onSelectLesson,
  onSelectQuiz,
  isPreview,
}: {
  curriculum: CourseCurriculum;
  currentLessonId: string;
  onSelectLesson: (lesson: CurriculumLesson, section: CurriculumSection) => void;
  onSelectQuiz: (lesson: CurriculumLesson, difficulty?: string) => void;
  isPreview: boolean;
}) {
  const pct = Math.round(curriculum.progressPercent ?? 0);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <p className="font-semibold text-sm truncate">{curriculum.courseTitle}</p>
        {!isPreview && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{curriculum.completedLessons}/{curriculum.totalLessons} lessons</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={curriculum.sections.map((s) => s.id)}>
          {curriculum.sections.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline bg-muted/30">
                <span className="text-left font-medium">{section.title}</span>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                {section.lessons.map((lesson) => {
                  const isActive = lesson.id === currentLessonId;
                  const hasQuiz = lesson.quizzes && lesson.quizzes.length > 0;
                  return (
                    <div key={lesson.id} className="border-b last:border-0">
                      <button
                        onClick={() => onSelectLesson(lesson, section)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-muted/50 ${
                          isActive ? "bg-primary/5 border-l-2 border-l-primary" : ""
                        }`}
                      >
                        <span className="shrink-0 mt-0.5">
                          {lesson.isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug ${isActive ? "font-semibold text-primary" : ""}`}>
                            {lesson.title}
                          </p>
                          {lesson.duration > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatSeconds(lesson.duration)}
                            </p>
                          )}
                        </div>
                      </button>
                      {hasQuiz && !isPreview && (
                        <button
                          onClick={() => onSelectQuiz(lesson)}
                          className="w-full text-left pl-11 pr-4 py-2 flex items-center gap-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-primary transition-colors border-t border-dashed"
                        >
                          <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Quiz · {lesson.quizzes!.length} level{lesson.quizzes!.length > 1 ? "s" : ""}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CoursePlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, token } = useAuthStore();

  const lessonIdParam = searchParams.get("lessonId");
  const isPreview = searchParams.get("preview") === "true";

  // ── State ──────────────────────────────────────────────────────────────────

  const [curriculum, setCurriculum] = useState<CourseCurriculum | null>(null);
  const [currentLesson, setCurrentLesson] = useState<CurriculumLesson | null>(null);
  const [currentSection, setCurrentSection] = useState<CurriculumSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [pointsPopup, setPointsPopup] = useState<number | null>(null);

  // Notes
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const progressSaveTimer = useRef<ReturnType<typeof setInterval>>();

  // Custom video controls (native controls would expose the full, uncropped
  // source video for chunked lessons — we only ever show this lesson's slice)
  const [isPlaying, setIsPlaying] = useState(false);
  const [relativeTime, setRelativeTime] = useState(0); // seconds since this lesson's clip start
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Load curriculum ────────────────────────────────────────────────────────

  const loadCurriculum = useCallback(async () => {
    if (!courseId) return;

    // If preview mode, redirect non-auth users to course detail
    if (!token && !isPreview) {
      navigate(`/courses/${courseId}`);
      return;
    }

    try {
      setLoading(true);
      const data = await studentService.getCourseCurriculum(courseId);
      setCurriculum(data);

      // Determine which lesson to open
      let targetLesson: CurriculumLesson | null = null;
      let targetSection: CurriculumSection | null = null;

      if (lessonIdParam) {
        // Specific lesson requested (preview click or continue)
        for (const section of data.sections) {
          const found = section.lessons.find((l) => l.id === lessonIdParam);
          if (found) {
            targetLesson = found;
            targetSection = section;
            break;
          }
        }
      }

      if (!targetLesson && !isPreview) {
        // Find the first incomplete lesson (continue learning)
        for (const section of data.sections) {
          const incomplete = section.lessons.find((l) => !l.isCompleted);
          if (incomplete) {
            targetLesson = incomplete;
            targetSection = section;
            break;
          }
        }
      }

      // Fallback to first lesson
      if (!targetLesson && data.sections.length > 0 && data.sections[0].lessons.length > 0) {
        targetLesson = data.sections[0].lessons[0];
        targetSection = data.sections[0];
      }

      if (targetLesson) {
        setCurrentLesson(targetLesson);
        setCurrentSection(targetSection);
      }
    } catch {
      setError("Could not load this course. Make sure you are enrolled.");
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonIdParam, isPreview, token]);

  useEffect(() => { loadCurriculum(); }, [loadCurriculum]);

  // ── Points badge: fetch current total on mount (also picks up quiz points
  // earned on a separate page when the student navigates back here) ─────────

  useEffect(() => {
    if (isPreview) return;
    getMyStats()
      .then((stats) => setUserPoints(stats.totalPoints))
      .catch(() => {});
  }, [isPreview]);

  // ── Auto-save video position every 10 seconds ─────────────────────────────

  useEffect(() => {
    if (isPreview || !currentLesson) return;
    clearInterval(progressSaveTimer.current);
    progressSaveTimer.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      studentService.updateLessonProgress({
        courseId: courseId!,
        lessonId: currentLesson.id,
        videoPosition: Math.floor(video.currentTime),
        timeSpent: 10,
      }).catch(() => {}); // silent — best effort
    }, 10_000);

    return () => clearInterval(progressSaveTimer.current);
  }, [currentLesson, courseId, isPreview]);

  // ── Clip boundaries for this lesson ───────────────────────────────────────
  // Chunked lessons all point at the same source VideoUrl; startTime/endTime mark
  // which slice belongs to this lesson. endTime <= startTime means "no trim,
  // whole file" (single-lesson mode, where the lesson owns its entire video).

  const clipStart = currentLesson?.startTime ?? 0;
  const clipEndRaw = currentLesson?.endTime ?? 0;
  const isClipped = clipEndRaw > clipStart;
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    setTotalDuration(isClipped ? clipEndRaw - clipStart : (currentLesson?.duration ?? 0));
    setRelativeTime(0);
    setIsPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentLesson) return;

    let completeFired = false;

    const seekToStart = () => {
      if (video.currentTime < clipStart) video.currentTime = clipStart;
      if (!isClipped) setTotalDuration(video.duration || currentLesson.duration || 0);
    };

    const onTimeUpdate = () => {
      if (isClipped && video.currentTime >= clipEndRaw) {
        video.pause();
        video.currentTime = clipEndRaw;
        setRelativeTime(totalDuration);
        if (!completeFired && !isPreview && !currentLesson.isCompleted) {
          completeFired = true;
          handleMarkComplete();
        }
        return;
      }
      setRelativeTime(Math.max(0, video.currentTime - clipStart));
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", seekToStart);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("loadedmetadata", seekToStart);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Select lesson ─────────────────────────────────────────────────────────

  const handleSelectLesson = (lesson: CurriculumLesson, section: CurriculumSection) => {
    setCurrentLesson(lesson);
    setCurrentSection(section);
    setNotes([]);
    setNewNoteText("");
    setShowNoteForm(false);
  };

  // ── Navigate prev/next ────────────────────────────────────────────────────

  const allLessons = curriculum?.sections.flatMap((s) =>
    s.lessons.map((l) => ({ lesson: l, section: s }))
  ) ?? [];

  const currentIndex = allLessons.findIndex((x) => x.lesson.id === currentLesson?.id);

  const goToLesson = (index: number) => {
    if (index < 0 || index >= allLessons.length) return;
    const { lesson, section } = allLessons[index];
    handleSelectLesson(lesson, section);
  };

  // ── Mark complete ─────────────────────────────────────────────────────────

  const handleMarkComplete = async () => {
    if (!currentLesson || isPreview) return;
    setCompleting(true);
    try {
      const result = await studentService.markLessonComplete({
        courseId: courseId!,
        lessonId: currentLesson.id,
      });

      toast({
        title: "Lesson completed! ✓",
        description: result.courseCompleted ? "🎉 Course completed! Congratulations!" : undefined,
      });

      // Refresh curriculum to update checkmarks
      const updated = await studentService.getCourseCurriculum(courseId!);
      setCurriculum(updated);

      // Update local lesson state
      setCurrentLesson((prev) => prev ? { ...prev, isCompleted: true } : prev);

      // Update points badge + show a brief "+N" increment popup
      if (result.pointsEarned > 0) {
        setUserPoints(result.totalPoints);
        setPointsPopup(result.pointsEarned);
        setTimeout(() => setPointsPopup(null), 2000);
        // Any other component reading points/badges via React Query (e.g. a
        // navbar badge) needs to know this data is stale now, or it'll sit
        // on the old cached value until its own staleTime elapses.
        queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
      }

      const hasQuiz = !!currentLesson.quizzes && currentLesson.quizzes.length > 0;

      if (result.courseCompleted) {
        setTimeout(() => {
          navigate(`/course/${courseId}/complete`, {
            state: {
              courseTitle: updated.courseTitle,
              pointsEarned: result.pointsEarned,
              totalPoints: result.totalPoints,
            },
          });
        }, 800);
      } else if (hasQuiz) {
        // Let the student choose a difficulty and take the quiz instead of
        // silently auto-advancing past it.
        setShowQuizPrompt(true);
      } else if (currentIndex < allLessons.length - 1) {
        // Auto-advance to next lesson
        setTimeout(() => goToLesson(currentIndex + 1), 1000);
      }
    } catch {
      toast({ title: "Failed to mark complete", variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  };

  // ── Bookmark ──────────────────────────────────────────────────────────────

  const handleToggleBookmark = async () => {
    if (isPreview || !currentLesson) return;
    try {
      const result = await studentService.toggleBookmark({
        courseId: courseId!,
        lessonId: currentLesson.id,
      });
      setIsBookmarked(result.isBookmarked);
      toast({ title: result.isBookmarked ? "Lesson bookmarked" : "Bookmark removed" });
    } catch {
      toast({ title: "Failed to update bookmark", variant: "destructive" });
    }
  };

  // ── Custom video controls ──────────────────────────────────────────────────
  // Native <video controls> would show this lesson's full underlying source
  // file (chunked lessons share one video). We render our own controls scoped
  // to just [clipStart, clipEnd] so students never see/scrub outside the slice.

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play(); else video.pause();
  };

  const seekTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.min(Math.max(0, seconds), totalDuration);
    video.currentTime = clipStart + clamped;
    setRelativeTime(clamped);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const container = videoContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // ── Add note ──────────────────────────────────────────────────────────────

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !currentLesson || isPreview) return;
    setAddingNote(true);
    try {
      const video = videoRef.current;
      const timestamp = video ? Math.floor(video.currentTime) : undefined;

      const note = await studentService.createNote({
        courseId: courseId!,
        lessonId: currentLesson.id,
        content: newNoteText.trim(),
        videoTimestamp: timestamp,
      });
      setNotes((prev) => [note, ...prev]);
      setNewNoteText("");
      setShowNoteForm(false);
      toast({ title: "Note saved" });
    } catch {
      toast({ title: "Failed to save note", variant: "destructive" });
    } finally {
      setAddingNote(false);
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p>Loading course…</p>
    </div>
  );

  if (error || !curriculum) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-muted-foreground">{error ?? "Course not found."}</p>
      <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
        Back to Course
      </Button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar ── */}
      <div className={`${sidebarOpen ? "w-80" : "w-0"} shrink-0 transition-all duration-200 overflow-hidden border-r bg-background`}>
        <CourseSidebar
          curriculum={curriculum}
          currentLessonId={currentLesson?.id ?? ""}
          onSelectLesson={handleSelectLesson}
          onSelectQuiz={(lesson, difficulty) =>
            navigate(
              `/course/${courseId}/lesson/${lesson.id}/quiz${difficulty ? `?difficulty=${difficulty}` : ""}`
            )
          }
          isPreview={isPreview}
        />
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background shrink-0">
          <Button variant="ghost" size="sm" className="p-1.5" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-1.5"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{curriculum.courseTitle}</p>
            <p className="text-sm font-medium truncate">{currentLesson?.title}</p>
          </div>
          {isPreview && (
            <Badge variant="secondary" className="shrink-0">Preview</Badge>
          )}
          {!isPreview && (
            <div className="flex items-center gap-2 shrink-0">
              {userPoints !== null && (
                <div className="relative">
                  <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Coins className="h-3.5 w-3.5" />
                    {userPoints.toLocaleString()}
                  </div>
                  {pointsPopup !== null && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
                      +{pointsPopup}
                    </span>
                  )}
                </div>
              )}
              <Button variant="ghost" size="sm" className="p-1.5" onClick={handleToggleBookmark}>
                {isBookmarked
                  ? <BookmarkCheck className="h-4 w-4 text-primary" />
                  : <Bookmark className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>

        {/* Video */}
        {currentLesson?.videoUrl ? (
          <div
            ref={videoContainerRef}
            className="relative bg-black w-full aspect-video shrink-0 group"
          >
            <video
              ref={videoRef}
              key={currentLesson.id}
              src={currentLesson.videoUrl}
              className="w-full h-full"
              onClick={togglePlay}
              onEnded={() => {
                if (!isClipped && !isPreview && !currentLesson.isCompleted) {
                  handleMarkComplete();
                }
              }}
            />

            {/* Center play/pause overlay */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20"
                aria-label="Play"
              >
                <span className="bg-white/90 rounded-full p-4">
                  <Play className="h-8 w-8 text-black" />
                </span>
              </button>
            )}

            {/* Custom control bar — scoped to this lesson's clip only */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <input
                type="range"
                min={0}
                max={Math.max(totalDuration, 0.1)}
                step={0.1}
                value={relativeTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="w-full accent-primary cursor-pointer"
                aria-label="Seek"
              />
              <div className="flex items-center gap-3 text-white">
                <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <span className="text-xs tabular-nums">
                  {formatTimestamp(relativeTime)} / {formatTimestamp(totalDuration)}
                </span>
                <button onClick={toggleFullscreen} className="ml-auto" aria-label="Fullscreen">
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-black w-full aspect-video shrink-0 flex items-center justify-center">
            <div className="text-white/60 text-center space-y-2">
              <Play className="h-10 w-10 mx-auto" />
              <p className="text-sm">No video available for this lesson</p>
            </div>
          </div>
        )}

        {/* Navigation + complete button */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToLesson(currentIndex - 1)}
            disabled={currentIndex <= 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {!isPreview && (
            <Button
              size="sm"
              onClick={handleMarkComplete}
              disabled={completing || currentLesson?.isCompleted}
              className={currentLesson?.isCompleted ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : currentLesson?.isCompleted ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : null}
              {currentLesson?.isCompleted ? "Completed" : "Mark as Complete"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToLesson(currentIndex + 1)}
            disabled={currentIndex >= allLessons.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Tabs: Transcript / Notes / Quiz / Materials */}
        <div className="flex-1 px-4 py-4">
          <Tabs defaultValue="transcript">
            <TabsList className="mb-4">
              <TabsTrigger value="transcript">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Transcript
              </TabsTrigger>
              {!isPreview && (
                <TabsTrigger value="notes">
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Notes
                </TabsTrigger>
              )}
              {currentLesson?.quizzes && currentLesson.quizzes.length > 0 && !isPreview && (
                <TabsTrigger value="quiz">
                  <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                  Quiz
                </TabsTrigger>
              )}
              {currentLesson?.materials && currentLesson.materials.length > 0 && (
                <TabsTrigger value="materials">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Materials
                </TabsTrigger>
              )}
            </TabsList>

            {/* Transcript */}
            <TabsContent value="transcript">
              {currentLesson?.transcript ? (
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed" dir="auto">
                  {currentLesson.transcript}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No transcript available for this lesson.</p>
              )}
            </TabsContent>

            {/* Notes */}
            {!isPreview && (
              <TabsContent value="notes" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
                  <Button size="sm" variant="outline" onClick={() => setShowNoteForm(!showNoteForm)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Note
                  </Button>
                </div>

                {showNoteForm && (
                  <div className="space-y-2 border rounded-lg p-3">
                    {videoRef.current && videoRef.current.currentTime > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        At {formatTimestamp(Math.floor(videoRef.current.currentTime))}
                      </p>
                    )}
                    <Textarea
                      placeholder="Write your note…"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => { setShowNoteForm(false); setNewNoteText(""); }}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleAddNote} disabled={addingNote || !newNoteText.trim()}>
                        {addingNote && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                {notes.length === 0 && !showNoteForm && (
                  <p className="text-sm text-muted-foreground">No notes yet. Add one while watching!</p>
                )}

                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-3 space-y-1.5">
                      {note.videoTimestamp != null && (
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = note.videoTimestamp!;
                              videoRef.current.play();
                            }
                          }}
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(note.videoTimestamp)}
                        </button>
                      )}
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}

            {/* Quiz */}
            {currentLesson?.quizzes && currentLesson.quizzes.length > 0 && !isPreview && (
              <TabsContent value="quiz">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Test your knowledge for this lesson — {currentLesson.quizzes.length} difficulty levels available.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
  {currentLesson.quizzes.map((quiz) => (
  <button
    key={quiz.difficulty}
    onClick={() => navigate(
      `/course/${courseId}/lesson/${currentLesson.id}/quiz?difficulty=${quiz.difficulty}`
    )}
    className="border rounded-xl p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors"
  >
    <p className="font-semibold capitalize">{quiz.difficulty}</p>
    <p className="text-xs text-muted-foreground mt-1">
      {quiz.questionCount} questions
    </p>
  </button>
))}
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Materials */}
            {currentLesson?.materials && currentLesson.materials.length > 0 && (
              <TabsContent value="materials">
                <div className="space-y-2">
                  {currentLesson.materials.map((m) => (
                    <a
                      key={m.id}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Download className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm flex-1">{m.title}</span>
                    </a>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Post-completion prompt: pick a difficulty and take the quiz */}
      <Dialog open={showQuizPrompt} onOpenChange={setShowQuizPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Lesson complete! 🎉</DialogTitle>
            <DialogDescription className="text-center">
              Ready to test what you just learned? Pick a difficulty to start the quiz.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3 py-2">
            {currentLesson?.quizzes?.map((quiz) => (
              <button
                key={quiz.difficulty}
                onClick={() => {
                  setShowQuizPrompt(false);
                  navigate(`/course/${courseId}/lesson/${currentLesson.id}/quiz?difficulty=${quiz.difficulty}`);
                }}
                className="border rounded-xl p-4 text-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <p className="font-semibold capitalize">{quiz.difficulty}</p>
                <p className="text-xs text-muted-foreground mt-1">{quiz.questionCount} questions</p>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setShowQuizPrompt(false);
                if (currentIndex < allLessons.length - 1) goToLesson(currentIndex + 1);
              }}
            >
              Skip for now — next lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}