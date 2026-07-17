import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, Sparkles, Save,
  ChevronDown, ChevronUp, Plus, Trash2, Check, ShieldCheck, ShieldAlert,
  RefreshCw, Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  videoProcessingService,
  VideoProcessingJob,
  DraftQuizQuestion,
} from "@/services/videoProcessingService";
import { YoutubePlayer } from "@/components/video/YoutubePlayer";

const DIFFICULTIES: Array<"easy" | "medium" | "hard"> = ["easy", "medium", "hard"];
const DIFF_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-red-100 text-red-700 border-red-200",
};

// ── Sub-component: Accuracy check banner ──────────────────────────────────────

function AccuracyPanel({
  job, onCheck, onApprove, checking,
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
          Run a check before generating a quiz.
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

export default function SingleLessonReviewPage() {
  const { courseId, jobId } = useParams<{ courseId: string; jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState<VideoProcessingJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingAccuracy, setCheckingAccuracy] = useState(false);

  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcriptDirty, setTranscriptDirty] = useState(false);
  const [order, setOrder] = useState(1);
  const [isFree, setIsFree] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [activeQuizTab, setActiveQuizTab] = useState<string>("easy");
  const [saving, setSaving] = useState(false);

  const [videoDuration, setVideoDuration] = useState(0);
const videoRef = useRef<HTMLVideoElement>(null);

  // ── Load job ────────────────────────────────────────────────────────────────

  const fetchJob = useCallback(() => {
    if (!jobId) return;
    videoProcessingService
      .getJob(jobId)
      .then((data) => {
        setJob(data);
        const chunk = data.chunks[0];
        if (chunk) {
          setTitle((prev) => prev || chunk.title);
          setTranscript((prev) => (transcriptDirty ? prev : chunk.transcript));
        }
      })
      .catch(() => setLoadError("Could not load this processing job."))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => { fetchJob(); }, [jobId]);

  useEffect(() => {
  if (job?.sourceType !== "upload") return;
  const video = videoRef.current;
  if (!video) return;
  const onMeta = () => setVideoDuration(Math.round(video.duration));
  video.addEventListener("loadedmetadata", onMeta);
  return () => video.removeEventListener("loadedmetadata", onMeta);
}, [job?.videoUrl, job?.sourceType]);

  const chunk = job?.chunks[0] ?? null;

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

  const handleSaveTranscriptEdit = async () => {
    if (!jobId || !chunk) return;
    try {
      await videoProcessingService.updateChunk(jobId, chunk.id, { transcript });
      setTranscriptDirty(false);
      toast({ title: "Transcript updated" });
      fetchJob();
    } catch {
      toast({ title: "Failed to update transcript", variant: "destructive" });
    }
  };

  // ── Quiz generation ───────────────────────────────────────────────────────────

  const handleGenerateQuiz = async () => {
    if (!jobId || !chunk) return;
    setGenerating(true);
    try {
      await videoProcessingService.generateChunkQuiz(jobId, chunk.id, 5);
      toast({ title: "Quizzes generated ✓" });
      setActiveQuizTab("easy");
      fetchJob();
    } catch (err: any) {
      toast({ title: "Quiz generation failed", description: err?.response?.data?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateQuestion = async (difficulty: string, index: number, updated: DraftQuizQuestion) => {
    if (!jobId || !chunk) return;
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

  const handleDeleteQuestion = async (difficulty: string, index: number) => {
    if (!jobId || !chunk) return;
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

  const handleAddQuestion = async (difficulty: string) => {
    if (!jobId || !chunk) return;
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

  // ── Save as lesson ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!jobId || !chunk) return;
    if (!title.trim()) {
      toast({ title: "Enter a lesson title", variant: "destructive" });
      return;
    }
    const hasAnyQuestions = chunk.draftQuizzes.some((q) => q.questions.length > 0);
    if (!hasAnyQuestions) {
      toast({ title: "Generate a quiz before saving", variant: "destructive" });
      return;
    }
    if (job && !job.isTranscriptApproved) {
      const proceed = window.confirm(
        "You haven't approved the transcript yet. Save this lesson anyway?"
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {

await videoProcessingService.saveChunkAsLesson(jobId, chunk.id, {
  title: title.trim(),
  transcript,
  order,
  isFree,
  duration: videoDuration,
});
      toast({ title: "Lesson saved ✓" });
      navigate(`/creator/courses/${courseId}?tab=curriculum`);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err?.response?.data?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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

  if (loadError || !job || !chunk) {
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

  const hasAnyQuiz = chunk.draftQuizzes.some((q) => q.questions.length > 0);
  const isSaved = chunk.isSaved;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-5 pb-12">

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/creator/courses/${courseId}?tab=curriculum`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Course
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold">New Lesson</h1>
          <p className="text-muted-foreground text-sm">
            Check the transcript, generate a quiz, then save it as a lesson.
          </p>
        </div>

        {isSaved && (
          <Badge variant="secondary" className="text-green-600 bg-green-50">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Saved as lesson
          </Badge>
        )}

        {/* Video preview */}
        {job.sourceType === "upload" && job.videoUrl && (
          <Card>
            <CardContent className="pt-4 pb-3">
              <video src={job.videoUrl} controls className="w-full rounded-lg bg-black max-h-72" />
            </CardContent>
          </Card>
        )}
        {job.sourceType === "youtube" && job.sourceUrl && (
          <Card>
            <CardContent className="pt-4 pb-3">
              <YoutubePlayer
     url={job.sourceUrl}
     playing={false}
     seekRequest={null}
     onReady={(d) => setVideoDuration(Math.round(d))}
     onTimeUpdate={() => {}}
     onPlayStateChange={() => {}}
   />
            </CardContent>
          </Card>
        )}

        {/* Accuracy panel */}
        <AccuracyPanel
          job={job}
          checking={checkingAccuracy}
          onCheck={handleCheckAccuracy}
          onApprove={handleApproveTranscript}
        />

        {/* Approval reminder — shown whenever the transcript isn't approved yet. */}
        {!job.isTranscriptApproved && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {job.accuracyScore == null
              ? "You haven't checked the transcript yet — you can still continue, but reviewing it first is recommended."
              : "You checked the transcript but haven't approved a version yet — pick one above before generating a quiz."}
          </div>
        )}

        {/* Lesson title */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lesson Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Lesson Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Variables"
                disabled={isSaved}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 max-w-[140px]">
                <Label className="text-xs">Order in Section</Label>
                <Input
                  type="number" min={1} value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                  disabled={isSaved}
                />
              </div>
              <div className="flex items-end gap-2 pb-1.5">
                <input
                  type="checkbox" id="isFree"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  disabled={isSaved}
                  className="rounded"
                />
                <Label htmlFor="isFree" className="cursor-pointer text-sm">Free preview lesson</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Transcript</CardTitle>
            <CardDescription>
              Shown to students beneath the video. Edit freely before saving.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={transcript}
              onChange={(e) => { setTranscript(e.target.value); setTranscriptDirty(true); }}
              rows={12}
              className="font-mono text-sm resize-y"
              disabled={isSaved}
              dir="auto"
            />
            {transcriptDirty && !isSaved && (
              <Button size="sm" onClick={handleSaveTranscriptEdit}>
                Save Transcript Edit
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {transcript.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </CardContent>
        </Card>

        {/* Quiz */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Quiz</span>
              {!isSaved && (
                <Button size="sm" onClick={handleGenerateQuiz} disabled={generating}>
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  {hasAnyQuiz ? "Regenerate Quiz" : "Generate Quiz"}
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              Generates easy / medium / hard versions from the transcript above.
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
                        onClick={() => setActiveQuizTab(d)}
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
                          onChange={(updated) => handleUpdateQuestion(d, i, updated)}
                          onDelete={() => handleDeleteQuestion(d, i)}
                        />
                      ))}
                      {!isSaved && (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleAddQuestion(d)}>
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
        {!isSaved ? (
          <div className="flex justify-end pb-4">
            <Button size="lg" onClick={handleSave} disabled={saving || !hasAnyQuiz || !title.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Lesson
            </Button>
          </div>
        ) : (
          <div className="flex justify-end pb-4">
            <Button onClick={() => navigate(`/creator/courses/${courseId}?tab=curriculum`)}>
              Back to Course
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}