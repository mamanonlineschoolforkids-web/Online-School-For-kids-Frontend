import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Trophy,
  Loader2, AlertCircle, ChevronRight, RotateCcw,
  HelpCircle, Star, History, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { studentService, QuizAttemptDto , LessonQuizFull } from "@/services/studentService";
import { useQueryClient } from "@tanstack/react-query";
import { leaderboardKeys } from "@/services/useleaderboard";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  text: string;
  options: { id: string; text: string; isCorrect: boolean; order: number }[];
  correctAnswer: number;
  explanation?: string;
}

interface LessonQuiz {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  questions: QuizQuestion[];
}

type QuizPhase = "pick-difficulty" | "quiz" | "result" | "history";

const DIFF_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
  hard: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
};

const PASS_THRESHOLD = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const difficultyParam = searchParams.get("difficulty") as "easy" | "medium" | "hard" | null;

  const [quizzes, setQuizzes] = useState<LessonQuiz[]>([]);
  const [pastAttempts, setPastAttempts] = useState<QuizAttemptDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz session state
  const [phase, setPhase] = useState<QuizPhase>("pick-difficulty");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<LessonQuiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<{ questionIndex: number; selectedAnswer: number; isCorrect: boolean }[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [saving, setSaving] = useState(false);
  const [attemptResult, setAttemptResult] = useState<{
    score: number; correctAnswers: number; totalQuestions: number; passed: boolean;
    pointsEarned: number; totalPoints: number;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // ── Load lesson quizzes ────────────────────────────────────────────────────


useEffect(() => {
  if (!courseId || !lessonId) return;
  Promise.all([
    studentService.getLessonQuiz(courseId, lessonId),
    studentService.getLessonQuizAttempts(lessonId),
  ])
    .then(([quizContent, attempts]) => {
      if (!quizContent || quizContent.length === 0) {
        setQuizzes([]);
        setPastAttempts(attempts);
        setPhase("pick-difficulty");
        return;
      }
 
      const mapped: LessonQuiz[] = quizContent.map((q) => ({
        id: q.difficulty,
        difficulty: q.difficulty as "easy" | "medium" | "hard",
        questions: q.questions.map((qq) => ({
          text: qq.text,
          options: qq.options.map((o) => ({
            id: o.id,
            text: o.text,
            isCorrect: o.order === qq.correctAnswer, // derived; not sent by API
            order: o.order,
          })),
          correctAnswer: qq.correctAnswer,
          explanation: qq.explanation,
        })),
      }));
 
      setQuizzes(mapped);
      setPastAttempts(attempts);
 
      // Auto-start if difficulty was passed via query param
      if (difficultyParam) {
        const quiz = mapped.find((q) => q.difficulty === difficultyParam);
        if (quiz) {
          startQuiz(quiz);
          return;
        }
      }
      setPhase("pick-difficulty");
    })
    .catch(() => setError("Could not load quiz."))
    .finally(() => setLoading(false));
}, [courseId, lessonId, difficultyParam]);
 
  // ── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "quiz" || !currentQuiz) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, currentIndex]);

  const startQuiz = (quiz: LessonQuiz) => {
    setCurrentQuiz(quiz);
    setSelectedDifficulty(quiz.difficulty);
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setAttemptResult(null);
    setTimeLeft(quiz.difficulty === "easy" ? 30 : quiz.difficulty === "medium" ? 45 : 60);
    setPhase("quiz");
  };

  const handleTimeUp = () => {
    if (!currentQuiz) return;
    const q = currentQuiz.questions[currentIndex];
    const recorded = {
      questionIndex: currentIndex,
      selectedAnswer: -1,
      isCorrect: false,
    };
    const newAnswers = [...answers, recorded];

    if (currentIndex < currentQuiz.questions.length - 1) {
      setAnswers(newAnswers);
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      const newDiff = currentQuiz.difficulty;
      setTimeLeft(newDiff === "easy" ? 30 : newDiff === "medium" ? 45 : 60);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const handleSelectAnswer = (idx: number) => {
    if (showFeedback || selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    setShowFeedback(true);
    clearInterval(timerRef.current);

    if (!currentQuiz) return;
    const q = currentQuiz.questions[currentIndex];
    const correct = idx === q.correctAnswer;
    const recorded = { questionIndex: currentIndex, selectedAnswer: idx, isCorrect: correct };
    const newAnswers = [...answers, recorded];

    setTimeout(() => {
      if (currentIndex < currentQuiz.questions.length - 1) {
        setAnswers(newAnswers);
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
        const newDiff = currentQuiz.difficulty;
        setTimeLeft(newDiff === "easy" ? 30 : newDiff === "medium" ? 45 : 60);
      } else {
        setAnswers(newAnswers);
        finishQuiz(newAnswers);
      }
    }, 1200);
  };

  const finishQuiz = async (finalAnswers: typeof answers) => {
    if (!currentQuiz || !courseId || !lessonId) return;
    clearInterval(timerRef.current);
    setSaving(true);
    try {
      const result = await studentService.saveQuizAttempt({
        courseId,
        lessonId,
        difficulty: currentQuiz.difficulty,
        answers: finalAnswers,
      });
      setAttemptResult(result);
      const updated = await studentService.getLessonQuizAttempts(lessonId);
      setPastAttempts(updated);
      if (result.pointsEarned > 0) {
        queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
      }
    } catch {
      toast({ title: "Could not save attempt", variant: "destructive" });
      const correct = finalAnswers.filter((a) => a.isCorrect).length;
      const total = finalAnswers.length;
      setAttemptResult({
        score: total > 0 ? Math.round((correct / total) * 100) : 0,
        correctAnswers: correct,
        totalQuestions: total,
        passed: total > 0 && correct / total >= PASS_THRESHOLD / 100,
        pointsEarned: 0,
        totalPoints: 0,
      });
    } finally {
      setSaving(false);
      setPhase("result");
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p>Loading quiz…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-muted-foreground">{error}</p>
      <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  if (quizzes.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <HelpCircle className="h-10 w-10 text-muted-foreground" />
      <p className="text-muted-foreground">No quiz available for this lesson.</p>
      <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  // ── Render: pick difficulty ────────────────────────────────────────────────

  if (phase === "pick-difficulty") {
    const bestByDiff: Record<string, QuizAttemptDto> = {};
    pastAttempts.forEach((a) => {
      if (!bestByDiff[a.difficulty] || a.score > bestByDiff[a.difficulty].score) {
        bestByDiff[a.difficulty] = a;
      }
    });

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">Choose Difficulty</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 max-w-md mx-auto w-full">
          <div className="text-center space-y-2">
            <HelpCircle className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Lesson Quiz</h2>
            <p className="text-sm text-muted-foreground">Select a difficulty level to begin.</p>
          </div>

          <div className="w-full space-y-3">
            {quizzes.map((quiz) => {
              const best = bestByDiff[quiz.difficulty];
              return (
                <button
                  key={quiz.difficulty}
                  onClick={() => startQuiz(quiz)}
                  className={`w-full border rounded-xl p-4 text-left transition-colors ${DIFF_COLORS[quiz.difficulty]}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold capitalize">{quiz.difficulty}</p>
                      <p className="text-xs opacity-75 mt-0.5">
                        {quiz.questions.length} questions ·{" "}
                        {quiz.difficulty === "easy" ? 30 : quiz.difficulty === "medium" ? 45 : 60}s per question
                      </p>
                    </div>
                    <div className="text-right">
                      {best ? (
                        <div>
                          <p className="text-sm font-bold">{Math.round(best.score)}%</p>
                          <p className="text-xs opacity-75">Best score</p>
                        </div>
                      ) : (
                        <span className="text-xs opacity-60">Not attempted</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {pastAttempts.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setPhase("history")}
            >
              <History className="h-4 w-4 mr-2" />
              View Attempt History ({pastAttempts.length})
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Render: quiz in progress ───────────────────────────────────────────────

  if (phase === "quiz" && currentQuiz) {
    const q = currentQuiz.questions[currentIndex];
    const progress = ((currentIndex) / currentQuiz.questions.length) * 100;
    const timeColor = timeLeft <= 10 ? "text-red-500" : "text-muted-foreground";

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Button variant="ghost" size="sm" onClick={() => setPhase("pick-difficulty")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <Progress value={progress} className="h-2" />
          </div>
          <span className={`text-sm font-mono font-semibold shrink-0 ${timeColor}`}>
            <Clock className="h-3.5 w-3.5 inline mr-1" />
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm text-muted-foreground shrink-0">
            {currentIndex + 1}/{currentQuiz.questions.length}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full space-y-6">
          <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
              <Badge className={`capitalize ${DIFF_COLORS[currentQuiz.difficulty]}`}>
                {currentQuiz.difficulty}
              </Badge>
              <span className="text-xs text-muted-foreground">Question {currentIndex + 1}</span>
            </div>
            <p className="text-base font-semibold leading-snug" dir="auto">{q.text}</p>
          </div>

          <div className="w-full space-y-2.5">
            {q.options
              .sort((a, b) => a.order - b.order)
              .map((opt, idx) => {
                let cls = "border rounded-xl p-4 text-left text-sm w-full transition-colors ";
                if (!showFeedback) {
                  cls += "hover:border-primary hover:bg-primary/5 cursor-pointer";
                } else if (idx === q.correctAnswer) {
                  cls += "bg-green-100 border-green-500 text-green-800";
                } else if (idx === selectedAnswer && idx !== q.correctAnswer) {
                  cls += "bg-red-100 border-red-500 text-red-800";
                } else {
                  cls += "opacity-50";
                }

                return (
                  <button key={opt.id ?? idx} className={cls} onClick={() => handleSelectAnswer(idx)}>
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span dir="auto">{opt.text}</span>
                      {showFeedback && idx === q.correctAnswer && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto shrink-0" />
                      )}
                      {showFeedback && idx === selectedAnswer && idx !== q.correctAnswer && (
                        <XCircle className="h-4 w-4 text-red-600 ml-auto shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
          </div>

          {showFeedback && q.explanation && (
            <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800" dir="auto">
              <strong>Explanation:</strong> {q.explanation}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: result ────────────────────────────────────────────────────────

  if (phase === "result" && attemptResult) {
    const { score, correctAnswers, totalQuestions, passed, pointsEarned } = attemptResult;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          {passed ? (
            <Trophy className="h-16 w-16 text-amber-500 mx-auto" />
          ) : (
            <XCircle className="h-16 w-16 text-red-400 mx-auto" />
          )}

          <div>
            <h2 className="text-2xl font-bold">{passed ? "Great job!" : "Keep practicing!"}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {passed ? "You passed this quiz." : `You need ${PASS_THRESHOLD}% to pass.`}
            </p>
          </div>

          {passed && pointsEarned > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary font-semibold text-sm px-4 py-1.5 rounded-full animate-in fade-in zoom-in duration-300">
              <Sparkles className="h-4 w-4" />
              +{pointsEarned} points
            </div>
          )}

          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="text-4xl font-bold" style={{ color: passed ? "#16a34a" : "#ef4444" }}>
                {Math.round(score)}%
              </div>
              <Progress value={score} className="h-3" />
              <div className="grid grid-cols-2 gap-3 text-sm pt-1">
                <div className="border rounded-lg p-2.5">
                  <p className="text-muted-foreground text-xs">Correct</p>
                  <p className="font-bold text-lg text-green-600">{correctAnswers}</p>
                </div>
                <div className="border rounded-lg p-2.5">
                  <p className="text-muted-foreground text-xs">Incorrect</p>
                  <p className="font-bold text-lg text-red-500">{totalQuestions - correctAnswers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Button className="w-full" onClick={() => {
              const quiz = quizzes.find((q) => q.difficulty === selectedDifficulty);
              if (quiz) startQuiz(quiz);
            }}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setPhase("pick-difficulty")}>
              Change Difficulty
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>
              Back to Lesson
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: history ────────────────────────────────────────────────────────

  if (phase === "history") {
    const DIFF_BADGE: Record<string, string> = {
      easy: "bg-green-100 text-green-700",
      medium: "bg-amber-100 text-amber-700",
      hard: "bg-red-100 text-red-700",
    };

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Button variant="ghost" size="sm" onClick={() => setPhase("pick-difficulty")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">Attempt History</h1>
        </div>

        <div className="flex-1 p-4 max-w-md mx-auto w-full space-y-3">
          {pastAttempts.map((attempt) => (
            <div key={attempt.id} className="border rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DIFF_BADGE[attempt.difficulty] ?? "bg-muted"}`}>
                  {attempt.difficulty}
                </span>
                <p className="text-xs text-muted-foreground">
                  {new Date(attempt.completedAt).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {attempt.correctAnswers}/{attempt.totalQuestions} correct
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${attempt.passed ? "text-green-600" : "text-red-500"}`}>
                  {Math.round(attempt.score)}%
                </p>
                <Badge variant="secondary" className={`text-xs ${attempt.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {attempt.passed ? "Passed" : "Failed"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}