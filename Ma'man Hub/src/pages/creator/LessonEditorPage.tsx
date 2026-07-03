import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, Save,
  ChevronDown, ChevronUp, Plus, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { courseService, ManagementLessonDto, QuizQuestionDraft } from "@/services/courseService";
import { MaterialsManager } from "@/components/lesson/MaterialsManager";

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const DIFF_COLORS: Record<Difficulty, string> = {
  easy: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-red-100 text-red-700 border-red-200",
};

function QuestionEditor({
  index, q, onChange, onDelete,
}: {
  index: number;
  q: QuizQuestionDraft;
  onChange: (q: QuizQuestionDraft) => void;
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

export default function LessonEditorPage() {
  const { courseId, sectionId, lessonId } = useParams<{
    courseId: string; sectionId: string; lessonId: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [lesson, setLesson] = useState<ManagementLessonDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [order, setOrder] = useState(1);
  const [isFree, setIsFree] = useState(false);
  const [saving, setSaving] = useState(false);

  // Quiz editing state — populated from the saved lesson's real question
  // content (lesson.quizzes), not just which difficulties exist.
  const [quizzes, setQuizzes] = useState<Record<Difficulty, QuizQuestionDraft[]>>({
    easy: [], medium: [], hard: [],
  });
  const [activeQuizTab, setActiveQuizTab] = useState<Difficulty>("easy");
  const [savingQuiz, setSavingQuiz] = useState<Record<Difficulty, boolean>>({
    easy: false, medium: false, hard: false,
  });

  // ── Load lesson ──────────────────────────────────────────────────────────

  const fetchLesson = () => {
    if (!courseId) return;
    setLoading(true);
    courseService
      .getCourseManagementDetail(courseId)
      .then((detail) => {
        const section = detail.sections.find((s) => s.id === sectionId);
        const found = section?.lessons.find((l) => l.id === lessonId);
        if (!found) {
          setError("Lesson not found.");
          return;
        }
        setLesson(found);
        setTitle(found.title);
        setTranscript(found.transcript ?? "");
        setOrder(found.order);
        setIsFree(found.isFree);

        const quizMap: Record<Difficulty, QuizQuestionDraft[]> = { easy: [], medium: [], hard: [] };
        found.quizzes.forEach((q) => {
          if (q.difficulty === "easy" || q.difficulty === "medium" || q.difficulty === "hard") {
            quizMap[q.difficulty] = q.questions;
          }
        });
        setQuizzes(quizMap);
      })
      .catch(() => setError("Could not load this lesson."))
      .finally(() => setLoading(false));
  };

  useEffect(fetchLesson, [courseId, sectionId, lessonId]);

  // ── Save lesson details (title/transcript/order/free) ─────────────────────

  const handleSaveDetails = async () => {
    if (!courseId || !sectionId || !lessonId) return;
    if (!title.trim()) {
      toast({ title: "Enter a lesson title", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await courseService.updateLesson(courseId, sectionId, lessonId, {
        title: title.trim(),
        description: transcript,
        duration: lesson?.duration ?? 0,
        order,
        videoUrl: lesson?.videoUrl ?? undefined,
        isFree,
      });
      toast({ title: "Lesson updated ✓" });
      fetchLesson();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err?.response?.data?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Quiz editing ─────────────────────────────────────────────────────────

  const updateQuestion = (difficulty: Difficulty, index: number, updated: QuizQuestionDraft) => {
    setQuizzes((prev) => ({
      ...prev,
      [difficulty]: prev[difficulty].map((q, i) => (i === index ? updated : q)),
    }));
  };

  const deleteQuestion = (difficulty: Difficulty, index: number) => {
    setQuizzes((prev) => ({
      ...prev,
      [difficulty]: prev[difficulty].filter((_, i) => i !== index),
    }));
  };

  const addQuestion = (difficulty: Difficulty) => {
    const blank: QuizQuestionDraft = { question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" };
    setQuizzes((prev) => ({ ...prev, [difficulty]: [...prev[difficulty], blank] }));
  };

  const handleSaveQuiz = async (difficulty: Difficulty) => {
    if (!courseId || !sectionId || !lessonId) return;
    setSavingQuiz((p) => ({ ...p, [difficulty]: true }));
    try {
      await courseService.updateLessonQuiz(courseId, sectionId, lessonId, difficulty, quizzes[difficulty]);
      toast({ title: `${difficulty} quiz saved ✓` });
      fetchLesson();
    } catch (err: any) {
      toast({ title: "Failed to save quiz", description: err?.response?.data?.message, variant: "destructive" });
    } finally {
      setSavingQuiz((p) => ({ ...p, [difficulty]: false }));
    }
  };

  // ── Guards ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p>Loading lesson…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !lesson) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-muted-foreground">{error ?? "Lesson not found."}</p>
          <Button variant="outline" onClick={() => navigate(`/creator/courses/${courseId}?tab=curriculum`)}>
            Back to Course
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 pb-12">

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/creator/courses/${courseId}?tab=curriculum`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Course
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Edit Lesson</h1>
          <p className="text-muted-foreground text-sm">
            Update this lesson's details, quizzes, and materials.
          </p>
        </div>

        {/* Lesson details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lesson Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 max-w-[140px]">
                <Label className="text-xs">Order</Label>
                <Input
                  type="number" min={1} value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="flex items-end gap-2 pb-1.5">
                <input
                  type="checkbox" id="isFree"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isFree" className="cursor-pointer text-sm">Free preview lesson</Label>
              </div>
            </div>
            {lesson.videoUrl && (
              <video src={lesson.videoUrl} controls className="w-full rounded-lg bg-black max-h-72" />
            )}
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Transcript</CardTitle>
            <CardDescription>Shown to students beneath the video.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={10}
              className="font-mono text-sm resize-y"
              dir="auto"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveDetails} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Details
          </Button>
        </div>

        {/* Quiz editor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quiz</CardTitle>
            <CardDescription>
              Edit existing questions, add new ones, or remove a difficulty entirely
              by deleting all its questions and saving.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => {
                const active = activeQuizTab === d;
                const hasQuiz = lesson.quizzes.some((q) => q.difficulty === d && q.questions.length > 0);
                return (
                  <button
                    key={d}
                    onClick={() => setActiveQuizTab(d)}
                    className={`text-sm font-medium rounded-lg py-2 border capitalize transition-colors flex items-center justify-center gap-1.5 ${
                      active ? DIFF_COLORS[d] : "hover:bg-muted"
                    }`}
                  >
                    {d}
                    {hasQuiz && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                  </button>
                );
              })}
            </div>

            {DIFFICULTIES.filter((d) => d === activeQuizTab).map((d) => (
              <div key={d} className="space-y-3">
                {quizzes[d].length === 0 && (
                  <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                    No questions yet for {d} — add some below.
                  </div>
                )}

                {quizzes[d].map((q, i) => (
                  <QuestionEditor
                    key={i}
                    index={i}
                    q={q}
                    onChange={(updated) => updateQuestion(d, i, updated)}
                    onDelete={() => deleteQuestion(d, i)}
                  />
                ))}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => addQuestion(d)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Question
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveQuiz(d)}
                    disabled={savingQuiz[d]}
                  >
                    {savingQuiz[d] ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    Save {d} Quiz
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Materials */}
        <MaterialsManager
          courseId={courseId!}
          sectionId={sectionId!}
          lessonId={lessonId!}
          materials={lesson.materials}
          onChanged={fetchLesson}
        />
      </div>
    </DashboardLayout>
  );
}