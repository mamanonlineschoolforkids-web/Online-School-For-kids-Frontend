import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, AlertCircle, Play, Pause, CheckCircle2,
  Sparkles, Save, ChevronDown, ChevronUp, Plus, Trash2, Check,
  ShieldCheck, ShieldAlert, RefreshCw, Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  videoProcessingService,
  VideoProcessingJob,
  VideoChunk,
  DraftQuizQuestion,
} from "@/services/videoProcessingService";
import { YoutubePlayer } from "@/components/video/YoutubePlayer";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTime(str: string): number {
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(str) || 0;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

const DIFFICULTIES: Array<"easy" | "medium" | "hard"> = ["easy", "medium", "hard"];
const DIFF_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-red-100 text-red-700 border-red-200",
};

// ── Sub-component: Accuracy check banner ──────────────────────────────────────

function AccuracyPanel({
  job,
  onCheck,
  onApprove,
  checking,
}: {
  job: VideoProcessingJob;
  onCheck: () => void;
  onApprove: (choice: "corrected" | "original") => void;
  checking: boolean;
}) {
  const hasResult = job.accuracyScore != null;
  const needsRevision = hasResult && job.accuracyScore! < 90;

  return (
    <Card className={needsRevision ? "border-amber-300 bg-amber-50/50" : "border-blue-200 bg-blue-50/40"}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {needsRevision ? (
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          )}
          Transcript Accuracy
        </CardTitle>
        <CardDescription>
          Run a check before splitting into chunks — this looks at the full transcript once.
          {job.isTranscriptApproved && (
            <span className="text-green-600 font-medium"> Approved ✓</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasResult ? (
          <Button onClick={onCheck} disabled={checking} variant="outline">
            {checking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            Check Accuracy
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold">{job.accuracyScore!.toFixed(0)}%</span>
              <div className="text-sm text-muted-foreground">
                {job.detectedLanguage && <p>Detected language: {job.detectedLanguage}</p>}
                {needsRevision && (
                  <p className="text-amber-700 font-medium">
                    Accuracy is below 90% — consider reviewing the transcript before continuing.
                  </p>
                )}
              </div>
            </div>

            {/* Side-by-side comparison so the creator can actually judge the
                correction before accepting it, rather than choosing blind. */}
            {job.correctedTranscript && !job.isTranscriptApproved && (
              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Original
                  </p>
                  <div className="border rounded-lg p-2.5 text-xs max-h-40 overflow-y-auto bg-white" dir="auto">
                    {job.rawTranscript}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Corrected
                  </p>
                  <div className="border border-green-200 rounded-lg p-2.5 text-xs max-h-40 overflow-y-auto bg-green-50/40" dir="auto">
                    {job.correctedTranscript}
                  </div>
                </div>
              </div>
            )}

            {!job.isTranscriptApproved && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={() => onApprove("corrected")}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Use Corrected Version
                </Button>
                <Button size="sm" variant="outline" onClick={() => onApprove("original")}>
                  Keep My Original
                </Button>
                <Button size="sm" variant="ghost" onClick={onCheck} disabled={checking}>
                  {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Re-check
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sub-component: Raw transcript editor (pre-chunking) ───────────────────────

function RawTranscriptEditor({
  job,
  onChange,
}: {
  job: VideoProcessingJob;
  onChange: (text: string) => void;
}) {
  const [text, setText] = useState(job.rawTranscript ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setText(job.rawTranscript ?? ""); setDirty(false); }, [job.rawTranscript]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4" />
          Raw Transcript
        </CardTitle>
        <CardDescription>
          Each line is timestamped — chunk boundaries are sliced from this text.
          Editing here clears the accuracy score and any approval until re-checked.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setDirty(true); }}
          rows={10}
          className="font-mono text-sm resize-y"
          dir="auto"
        />
        {dirty && (
          <Button size="sm" onClick={() => { onChange(text); setDirty(false); }}>
            Save Transcript Edit
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sub-component: Video + chunk timeline with draggable boundaries ──────────

interface TimelineProps {
  duration: number;
  chunks: VideoChunk[];
  currentTime: number;
  selectedChunkId: string | null;
  onSeek: (t: number) => void;
  onChunkSelect: (id: string) => void;
  onBoundaryDrag: (chunkId: string, edge: "start" | "end", seconds: number) => void;
}

function ChunkTimeline({
  duration, chunks, currentTime, selectedChunkId, onSeek, onChunkSelect, onBoundaryDrag,
}: TimelineProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ chunkId: string; edge: "start" | "end" } | null>(null);

  const toX = (t: number) => (t / Math.max(duration, 1)) * 100;

  const fromEvent = (e: React.MouseEvent | MouseEvent) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return Math.round(ratio * duration);
  };

  const handleBarClick = (e: React.MouseEvent) => {
    if (dragRef.current) return;
    onSeek(fromEvent(e));
  };

  const startDrag = (e: React.MouseEvent, chunkId: string, edge: "start" | "end") => {
    e.stopPropagation();
    dragRef.current = { chunkId, edge };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      onBoundaryDrag(dragRef.current.chunkId, dragRef.current.edge, fromEvent(ev));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const COLORS = [
    "bg-blue-400/70", "bg-violet-400/70", "bg-green-400/70",
    "bg-amber-400/70", "bg-rose-400/70", "bg-cyan-400/70",
  ];

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        Timeline — drag the edges of a chunk to resize it
      </Label>

      <div
        ref={barRef}
        onClick={handleBarClick}
        className="relative h-14 bg-muted rounded-lg overflow-visible cursor-crosshair select-none"
      >
        {chunks.map((chunk, i) => {
          const start = parseTime(chunk.startTime);
          const end = parseTime(chunk.endTime) || duration;
          const left = toX(start);
          const width = toX(end) - left;
          const color = COLORS[i % COLORS.length];
          const isSel = chunk.id === selectedChunkId;

          return (
            <div
              key={chunk.id}
              onClick={(e) => { e.stopPropagation(); onChunkSelect(chunk.id); }}
              className={`absolute top-1 bottom-1 rounded ${color} ${
                isSel ? "ring-2 ring-primary ring-offset-1 z-20" : "z-10"
              } ${chunk.isSaved ? "opacity-60" : ""} cursor-pointer flex items-center justify-center overflow-hidden`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
            >
              <span className="text-white text-xs font-medium truncate px-1 drop-shadow">
                {chunk.title || `Chunk ${i + 1}`}
              </span>

              {!chunk.isSaved && (
                <>
                  <div
                    onMouseDown={(e) => startDrag(e, chunk.id, "start")}
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/40 hover:bg-white/70 transition-colors z-30"
                  />
                  <div
                    onMouseDown={(e) => startDrag(e, chunk.id, "end")}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/40 hover:bg-white/70 transition-colors z-30"
                  />
                </>
              )}
            </div>
          );
        })}

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none"
          style={{ left: `${toX(currentTime)}%` }}
        >
          <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-0.5" />
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground px-0.5">
        <span>{formatTime(0)}</span>
        <span>{formatTime(duration / 2)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

// ── Sub-component: Quiz question editor ───────────────────────────────────────

function QuestionEditor({
  index, q, onChange, onDelete,
}: {
  index: number;
  q: DraftQuizQuestion;
  onChange: (q: DraftQuizQuestion) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 text-left text-sm font-medium"
      >
        <span>Q{index + 1}. {q.question.slice(0, 60)}{q.question.length > 60 ? "…" : ""}</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {q.options[q.correctAnswer]?.slice(0, 20) ?? "No answer"}
          </Badge>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Question</Label>
            <Textarea
              value={q.question}
              onChange={(e) => onChange({ ...q, question: e.target.value })}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Options (click ✓ to mark correct)</Label>
            {q.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => onChange({ ...q, correctAnswer: i })}
                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    q.correctAnswer === i
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-muted-foreground/30 hover:border-green-400"
                  }`}
                >
                  {q.correctAnswer === i && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
                <Input
                  value={opt}
                  onChange={(e) => {
                    const opts = [...q.options];
                    opts[i] = e.target.value;
                    onChange({ ...q, options: opts });
                  }}
                  className="text-sm flex-1"
                  placeholder={`Option ${i + 1}`}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Explanation</Label>
            <Textarea
              value={q.explanation}
              onChange={(e) => onChange({ ...q, explanation: e.target.value })}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ChunkReviewPage() {
  const { courseId, jobId } = useParams<{ courseId: string; jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState<VideoProcessingJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingAccuracy, setCheckingAccuracy] = useState(false);

  // Video preview
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [seekRequest, setSeekRequest] = useState<{ time: number; token: number } | null>(null);

  // Selected chunk + per-chunk UI state
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState<Record<string, boolean>>({});
  const [savingChunk, setSavingChunk] = useState<Record<string, boolean>>({});
  const [activeQuizTab, setActiveQuizTab] = useState<Record<string, string>>({});
  const [reviewWarnings, setReviewWarnings] = useState<Record<string, string>>({});

  // Section info for save (order increments per chunk, free toggle per chunk)
  const [chunkOrders, setChunkOrders] = useState<Record<string, number>>({});
  const [chunkFree, setChunkFree] = useState<Record<string, boolean>>({});

  // ── Load job ────────────────────────────────────────────────────────────────

  const fetchJob = useCallback(() => {
    if (!jobId) return;
    videoProcessingService
      .getJob(jobId)
      .then((data) => {
        setJob(data);
        setSelectedChunkId((prev) => prev ?? data.chunks[0]?.id ?? null);
        setChunkOrders((prev) => {
          const next = { ...prev };
          data.chunks.forEach((c, i) => { if (next[c.id] == null) next[c.id] = i + 1; });
          return next;
        });
      })
      .catch(() => setLoadError("Could not load this processing job."))
      .finally(() => setIsLoading(false));
  }, [jobId]);

  useEffect(() => { fetchJob(); }, [jobId]);

  // ── Native <video> element wiring (uploads only) ────────────────────────────

  useEffect(() => {
    if (job?.sourceType !== "upload") return;
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    const onMeta = () => setDuration(video.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [job?.videoUrl, job?.sourceType]);

  const togglePlay = () => {
    if (job?.sourceType === "youtube") {
      setPlaying((p) => !p);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    playing ? v.pause() : v.play();
  };

  const seekTo = (t: number) => {
    if (job?.sourceType === "youtube") {
      setSeekRequest({ time: t, token: Date.now() });
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(t, duration || Infinity));
    setCurrentTime(t);
  };

  // ── Accuracy check ───────────────────────────────────────────────────────────

  const handleCheckAccuracy = async () => {
    if (!jobId) return;
    setCheckingAccuracy(true);
    try {
      await videoProcessingService.checkAccuracy(jobId);
      fetchJob();
    } catch (err: any) {
      toast({ title: "Accuracy check failed", description: err?.response?.data?.message, variant: "destructive" });
    } finally {
      setCheckingAccuracy(false);
    }
  };

  const handleApproveTranscript = async (choice: "corrected" | "original") => {
    if (!jobId) return;
    try {
      await videoProcessingService.approveTranscript(jobId, choice);
      toast({ title: "Transcript approved" });
      fetchJob();
    } catch {
      toast({ title: "Failed to approve transcript", variant: "destructive" });
    }
  };

  const handleRawTranscriptEdit = async (text: string) => {
    if (!jobId) return;
    try {
      await videoProcessingService.updateRawTranscript(jobId, text);
      toast({ title: "Transcript updated — re-check accuracy when ready" });
      fetchJob();
    } catch {
      toast({ title: "Failed to update transcript", variant: "destructive" });
    }
  };

  // ── Chunk boundary drag ──────────────────────────────────────────────────────

  const dragUpdateTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleBoundaryDrag = (chunkId: string, edge: "start" | "end", seconds: number) => {
    setJob((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        chunks: prev.chunks.map((c) => {
          if (c.id !== chunkId) return c;
          return edge === "start"
            ? { ...c, startTime: formatTime(seconds) }
            : { ...c, endTime: formatTime(seconds) };
        }),
      };
    });

    clearTimeout(dragUpdateTimer.current);
    dragUpdateTimer.current = setTimeout(async () => {
      if (!jobId) return;
      try {
        const result = await videoProcessingService.updateChunk(jobId, chunkId, {
          startTime: edge === "start" ? formatTime(seconds) : undefined,
          endTime: edge === "end" ? formatTime(seconds) : undefined,
        });
        setReviewWarnings((prev) => ({
          ...prev,
          [chunkId]: result.needsTranscriptReview
            ? `Boundary falls between ${result.startAlignment?.nearestLineBefore ?? result.endAlignment?.nearestLineBefore ?? "?"} and ${result.startAlignment?.nearestLineAfter ?? result.endAlignment?.nearestLineAfter ?? "?"} — please review the transcript below.`
            : "",
        }));
        fetchJob();
      } catch {
        toast({ title: "Failed to update chunk boundary", variant: "destructive" });
        fetchJob(); // revert optimistic update on failure
      }
    }, 400);
  };

  // ── Chunk transcript manual edit ─────────────────────────────────────────────

  const handleChunkTranscriptEdit = async (chunkId: string, transcript: string) => {
    if (!jobId) return;
    try {
      await videoProcessingService.updateChunk(jobId, chunkId, { transcript });
      setReviewWarnings((prev) => ({ ...prev, [chunkId]: "" }));
      fetchJob();
    } catch {
      toast({ title: "Failed to update transcript", variant: "destructive" });
    }
  };

  // ── Quiz generation ───────────────────────────────────────────────────────────

  const handleGenerateQuiz = async (chunkId: string) => {
    if (!jobId) return;
    setGeneratingQuiz((p) => ({ ...p, [chunkId]: true }));
    try {
      await videoProcessingService.generateChunkQuiz(jobId, chunkId, 5);
      toast({ title: "Quizzes generated ✓" });
      setActiveQuizTab((p) => ({ ...p, [chunkId]: "easy" }));
      fetchJob();
    } catch (err: any) {
      toast({ title: "Quiz generation failed", description: err?.response?.data?.message, variant: "destructive" });
    } finally {
      setGeneratingQuiz((p) => ({ ...p, [chunkId]: false }));
    }
  };

  const handleUpdateQuestion = async (
    chunk: VideoChunk, difficulty: string, index: number, updated: DraftQuizQuestion
  ) => {
    if (!jobId) return;
    const quizSet = chunk.draftQuizzes.find((q) => q.difficulty === difficulty);
    if (!quizSet) return;
    const questions = quizSet.questions.map((q, i) => (i === index ? updated : q));
    try {
      await videoProcessingService.updateChunkQuizQuestions(jobId, chunk.id, difficulty, questions);
      fetchJob();
    } catch {
      toast({ title: "Failed to update question", variant: "destructive" });
    }
  };

  const handleDeleteQuestion = async (chunk: VideoChunk, difficulty: string, index: number) => {
    if (!jobId) return;
    const quizSet = chunk.draftQuizzes.find((q) => q.difficulty === difficulty);
    if (!quizSet) return;
    const questions = quizSet.questions.filter((_, i) => i !== index);
    try {
      await videoProcessingService.updateChunkQuizQuestions(jobId, chunk.id, difficulty, questions);
      fetchJob();
    } catch {
      toast({ title: "Failed to remove question", variant: "destructive" });
    }
  };

  const handleAddQuestion = async (chunk: VideoChunk, difficulty: string) => {
    if (!jobId) return;
    const quizSet = chunk.draftQuizzes.find((q) => q.difficulty === difficulty);
    const blank: DraftQuizQuestion = { question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" };
    const questions = [...(quizSet?.questions ?? []), blank];
    try {
      await videoProcessingService.updateChunkQuizQuestions(jobId, chunk.id, difficulty, questions);
      fetchJob();
    } catch {
      toast({ title: "Failed to add question", variant: "destructive" });
    }
  };

  // ── Save chunk as lesson ─────────────────────────────────────────────────────

  const handleSaveChunk = async (chunk: VideoChunk) => {
    if (!jobId) return;
    const hasAnyQuestions = chunk.draftQuizzes.some((q) => q.questions.length > 0);
    if (!hasAnyQuestions) {
      toast({ title: "Generate a quiz for this chunk first", variant: "destructive" });
      return;
    }
    if (job && !job.isTranscriptApproved) {
      const proceed = window.confirm(
        "You haven't approved the transcript yet. Save this lesson anyway?"
      );
      if (!proceed) return;
    }

    setSavingChunk((p) => ({ ...p, [chunk.id]: true }));
    try {
      await videoProcessingService.saveChunkAsLesson(jobId, chunk.id, {
        title: chunk.title,
        transcript: chunk.transcript,
        order: chunkOrders[chunk.id] ?? 1,
        isFree: chunkFree[chunk.id] ?? false,
      });
      toast({ title: "Lesson created ✓" });
      fetchJob();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err?.response?.data?.message, variant: "destructive" });
    } finally {
      setSavingChunk((p) => ({ ...p, [chunk.id]: false }));
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const chunks = job?.chunks ?? [];
  const savedCount = chunks.filter((c) => c.isSaved).length;
  const allSaved = chunks.length > 0 && savedCount === chunks.length;
  const selectedChunk = chunks.find((c) => c.id === selectedChunkId) ?? null;

  // ── Guards ────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loadError || !job) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-muted-foreground">{loadError ?? "Job not found."}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (job.status === "failed") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="font-semibold">Processing failed</p>
          <p className="text-sm text-muted-foreground">{job.errorMessage}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5 pb-12">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/creator/courses/${courseId}?tab=curriculum`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Course
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Review Video Chunks</h1>
          <p className="text-muted-foreground text-sm">
            Check the transcript, adjust chunk boundaries, generate a quiz for each chunk, then save it as a lesson.
          </p>
        </div>

        {/* Accuracy panel */}
        <AccuracyPanel
          job={job}
          checking={checkingAccuracy}
          onCheck={handleCheckAccuracy}
          onApprove={handleApproveTranscript}
        />

        {/* Approval reminder — shown any time the transcript isn't approved yet,
            whether or not it's ever been checked. */}
        {!job.isTranscriptApproved && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {job.accuracyScore == null
              ? "You haven't checked the transcript yet — you can still continue, but reviewing it first is recommended."
              : "You checked the transcript but haven't approved a version yet — pick one above before generating quizzes."}
          </div>
        )}

        {/* Raw transcript editor */}
        <RawTranscriptEditor job={job} onChange={handleRawTranscriptEdit} />

        {/* Video preview */}
        {job.sourceType === "upload" && job.videoUrl && (
          <Card>
            <CardContent className="pt-4 pb-3 space-y-3">
              <video ref={videoRef} src={job.videoUrl} className="w-full rounded-lg bg-black max-h-80" />
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={togglePlay}>
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm font-mono text-muted-foreground">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              {duration > 0 && (
                <ChunkTimeline
                  duration={duration}
                  chunks={chunks}
                  currentTime={currentTime}
                  selectedChunkId={selectedChunkId}
                  onSeek={seekTo}
                  onChunkSelect={setSelectedChunkId}
                  onBoundaryDrag={handleBoundaryDrag}
                />
              )}
            </CardContent>
          </Card>
        )}

        {job.sourceType === "youtube" && job.sourceUrl && (
          <Card>
            <CardContent className="pt-4 pb-3 space-y-3">
              <YoutubePlayer
                url={job.sourceUrl}
                playing={playing}
                seekRequest={seekRequest}
                onReady={(d) => setDuration(d)}
                onTimeUpdate={(t) => setCurrentTime(t)}
                onPlayStateChange={setPlaying}
              />
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={togglePlay}>
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm font-mono text-muted-foreground">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              {duration > 0 && (
                <ChunkTimeline
                  duration={duration}
                  chunks={chunks}
                  currentTime={currentTime}
                  selectedChunkId={selectedChunkId}
                  onSeek={seekTo}
                  onChunkSelect={setSelectedChunkId}
                  onBoundaryDrag={handleBoundaryDrag}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <div className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-4 py-2.5">
          <span className="font-medium">{savedCount} / {chunks.length} chunks saved as lessons</span>
          {allSaved && (
            <Button size="sm" onClick={() => navigate(`/creator/courses/${courseId}?tab=curriculum`)}>
              Done — Back to Course
            </Button>
          )}
        </div>

        {/* Chunk list + editor */}
        <div className="grid grid-cols-[220px_1fr] gap-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Chunks ({chunks.length})
            </p>
            {chunks.map((chunk, i) => (
              <button
                key={chunk.id}
                onClick={() => setSelectedChunkId(chunk.id)}
                className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  chunk.id === selectedChunkId ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <span className="shrink-0">
                  {chunk.isSaved ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <div className={`h-4 w-4 rounded-full border-2 ${
                      chunk.id === selectedChunkId ? "border-primary-foreground" : "border-muted-foreground/40"
                    }`} />
                  )}
                </span>
                <span className="truncate">{chunk.title || `Chunk ${i + 1}`}</span>
              </button>
            ))}
          </div>

          {selectedChunk && (
            <ChunkEditor
              chunk={selectedChunk}
              warning={reviewWarnings[selectedChunk.id]}
              order={chunkOrders[selectedChunk.id] ?? 1}
              isFree={chunkFree[selectedChunk.id] ?? false}
              onOrderChange={(v) => setChunkOrders((p) => ({ ...p, [selectedChunk.id]: v }))}
              onFreeChange={(v) => setChunkFree((p) => ({ ...p, [selectedChunk.id]: v }))}
              onTranscriptEdit={(text) => handleChunkTranscriptEdit(selectedChunk.id, text)}
              onGenerateQuiz={() => handleGenerateQuiz(selectedChunk.id)}
              generating={!!generatingQuiz[selectedChunk.id]}
              saving={!!savingChunk[selectedChunk.id]}
              onSave={() => handleSaveChunk(selectedChunk)}
              activeQuizTab={activeQuizTab[selectedChunk.id] ?? "easy"}
              onQuizTabChange={(d) => setActiveQuizTab((p) => ({ ...p, [selectedChunk.id]: d }))}
              onUpdateQuestion={(d, i, q) => handleUpdateQuestion(selectedChunk, d, i, q)}
              onDeleteQuestion={(d, i) => handleDeleteQuestion(selectedChunk, d, i)}
              onAddQuestion={(d) => handleAddQuestion(selectedChunk, d)}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── Sub-component: single chunk's full editor (transcript + quiz + save) ──────

function ChunkEditor({
  chunk, warning, order, isFree, onOrderChange, onFreeChange, onTranscriptEdit,
  onGenerateQuiz, generating, saving, onSave,
  activeQuizTab, onQuizTabChange, onUpdateQuestion, onDeleteQuestion, onAddQuestion,
}: {
  chunk: VideoChunk;
  warning?: string;
  order: number;
  isFree: boolean;
  onOrderChange: (v: number) => void;
  onFreeChange: (v: boolean) => void;
  onTranscriptEdit: (text: string) => void;
  onGenerateQuiz: () => void;
  generating: boolean;
  saving: boolean;
  onSave: () => void;
  activeQuizTab: string;
  onQuizTabChange: (d: string) => void;
  onUpdateQuestion: (difficulty: string, index: number, q: DraftQuizQuestion) => void;
  onDeleteQuestion: (difficulty: string, index: number) => void;
  onAddQuestion: (difficulty: string) => void;
}) {
  const [transcript, setTranscript] = useState(chunk.transcript);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setTranscript(chunk.transcript); setDirty(false); }, [chunk.id, chunk.transcript]);

  const hasAnyQuiz = chunk.draftQuizzes.some((q) => q.questions.length > 0);

  return (
    <div className="space-y-4 min-w-0">

      {chunk.isSaved && (
        <Badge variant="secondary" className="text-green-600 bg-green-50">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Saved as lesson
        </Badge>
      )}

      {warning && (
        <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          {warning}
        </div>
      )}

      {chunk.summary && (
        <Card className="bg-amber-50/60 border-amber-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              AI Chunk Summary
            </p>
            <p className="text-sm text-amber-900">{chunk.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transcript</CardTitle>
          <CardDescription>
            Automatically re-sliced when you drag boundaries. Edit freely if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={transcript}
            onChange={(e) => { setTranscript(e.target.value); setDirty(true); }}
            rows={8}
            className="font-mono text-sm resize-y"
            disabled={chunk.isSaved}
            dir="auto"
          />
          {dirty && !chunk.isSaved && (
            <Button size="sm" onClick={() => { onTranscriptEdit(transcript); setDirty(false); }}>
              Save Transcript Edit
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Lesson settings */}
      <Card>
        <CardContent className="pt-5 grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 max-w-[140px]">
            <Label className="text-xs">Lesson Order</Label>
            <Input
              type="number" min={1} value={order}
              onChange={(e) => onOrderChange(parseInt(e.target.value) || 1)}
              disabled={chunk.isSaved}
            />
          </div>
          <div className="flex items-end gap-2 pb-1.5">
            <input
              type="checkbox" id={`free-${chunk.id}`}
              checked={isFree}
              onChange={(e) => onFreeChange(e.target.checked)}
              disabled={chunk.isSaved}
              className="rounded"
            />
            <Label htmlFor={`free-${chunk.id}`} className="cursor-pointer text-sm">Free preview lesson</Label>
          </div>
        </CardContent>
      </Card>

      {/* Quiz generation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Quiz</span>
            {!chunk.isSaved && (
              <Button size="sm" onClick={onGenerateQuiz} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                {hasAnyQuiz ? "Regenerate Quiz" : "Generate Quiz"}
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Generates easy / medium / hard versions from this chunk's current transcript.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAnyQuiz ? (
            <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
              No quiz yet — click Generate Quiz once you're happy with the transcript above.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map((d) => {
                  const set = chunk.draftQuizzes.find((q) => q.difficulty === d);
                  const active = activeQuizTab === d;
                  return (
                    <button
                      key={d}
                      onClick={() => onQuizTabChange(d)}
                      className={`text-sm font-medium rounded-lg py-2 border capitalize transition-colors ${
                        active ? DIFF_COLORS[d] : "hover:bg-muted"
                      }`}
                    >
                      {d} {set ? `(${set.questions.length})` : ""}
                    </button>
                  );
                })}
              </div>

              {DIFFICULTIES.filter((d) => d === activeQuizTab).map((d) => {
                const set = chunk.draftQuizzes.find((q) => q.difficulty === d);
                return (
                  <div key={d} className="space-y-2">
                    {(set?.questions ?? []).map((q, i) => (
                      <QuestionEditor
                        key={i}
                        index={i}
                        q={q}
                        onChange={(updated) => onUpdateQuestion(d, i, updated)}
                        onDelete={() => onDeleteQuestion(d, i)}
                      />
                    ))}
                    {!chunk.isSaved && (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => onAddQuestion(d)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Question Manually
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      {!chunk.isSaved && (
        <div className="flex justify-end pb-4">
          <Button onClick={onSave} disabled={saving || !hasAnyQuiz}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save as Lesson
          </Button>
        </div>
      )}
    </div>
  );
}