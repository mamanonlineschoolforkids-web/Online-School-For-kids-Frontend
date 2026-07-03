import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Clock, CheckCircle, XCircle, ArrowRight, ArrowLeft,
  Trophy, RotateCcw, Home, Loader2, AlertCircle,
  Zap, Shield, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";
import api from "@/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface LessonQuiz {
  id: string;
  difficulty: Difficulty;
  questions: QuizQuestion[];
}

// ── Difficulty meta ───────────────────────────────────────────────────────────

const DIFF_META: Record<Difficulty, {
  label: string;
  description: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
  timePerQ: number;   // seconds per question
  passingScore: number;
}> = {
  easy: {
    label:        "Easy",
    description:  "Basic recall and understanding. Great for a first attempt.",
    color:        "text-green-700",
    bg:           "bg-green-50 border-green-200 hover:border-green-400",
    icon:         <Zap className="h-6 w-6 text-green-600" />,
    timePerQ:     30,
    passingScore: 60,
  },
  medium: {
    label:        "Medium",
    description:  "Application and analysis. Tests deeper understanding.",
    color:        "text-amber-700",
    bg:           "bg-amber-50 border-amber-200 hover:border-amber-400",
    icon:         <Shield className="h-6 w-6 text-amber-600" />,
    timePerQ:     45,
    passingScore: 70,
  },
  hard: {
    label:        "Hard",
    description:  "Synthesis and evaluation. For mastery of the material.",
    color:        "text-red-700",
    bg:           "bg-red-50 border-red-200 hover:border-red-400",
    icon:         <Flame className="h-6 w-6 text-red-600" />,
    timePerQ:     60,
    passingScore: 80,
  },
};

// ── Difficulty picker ─────────────────────────────────────────────────────────

function DifficultyPicker({
  quizzes,
  lessonTitle,
  onSelect,
}: {
  quizzes: LessonQuiz[];
  lessonTitle: string;
  onSelect: (d: Difficulty) => void;
}) {
  const available = quizzes.map((q) => q.difficulty);

  return (
    <div className="container max-w-2xl py-12">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground mb-1">{lessonTitle}</p>
        <h1 className="text-3xl font-bold mb-2">Choose Your Difficulty</h1>
        <p className="text-muted-foreground mb-8">
          All difficulty levels test the same lesson content but ask questions
          at different depths. You can retake at any level.
        </p>

        <div className="space-y-3">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
            const meta      = DIFF_META[d];
            const quiz      = quizzes.find((q) => q.difficulty === d);
            const available = !!quiz;

            return (
              <button
                key={d}
                disabled={!available}
                onClick={() => onSelect(d)}
                className={`w-full flex items-center gap-4 border-2 rounded-xl p-5 text-left transition-all ${
                  available
                    ? `${meta.bg} cursor-pointer`
                    : "opacity-40 cursor-not-allowed bg-muted border-muted"
                }`}
              >
                <div className="shrink-0">{meta.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-bold ${meta.color}`}>{meta.label}</span>
                    {available && (
                      <Badge variant="secondary" className="text-xs">
                        {quiz!.questions.length} questions ·{" "}
                        {Math.round((quiz!.questions.length * meta.timePerQ) / 60)} min
                      </Badge>
                    )}
                    {!available && (
                      <Badge variant="secondary" className="text-xs bg-muted">Not available</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                </div>
                <ArrowRight className={`h-5 w-5 shrink-0 ${meta.color}`} />
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ── Quiz runner ───────────────────────────────────────────────────────────────

function QuizRunner({
  quiz,
  lessonTitle,
  courseId,
  lessonId,
  onRetry,
}: {
  quiz: LessonQuiz;
  lessonTitle: string;
  courseId: string;
  lessonId: string;
  onRetry: () => void;
}) {
  const navigate = useNavigate();
  const meta     = DIFF_META[quiz.difficulty];
  const timeLimit = quiz.questions.length * meta.timePerQ;

  const [currentQ, setCurrentQ]     = useState(0);
  const [answers, setAnswers]       = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft]     = useState(timeLimit);
  const [submitted, setSubmitted]   = useState(false);

  // Timer
  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (qId: string, idx: number) =>
    setAnswers((p) => ({ ...p, [qId]: idx }));

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach((q) => { if (answers[q.id] === q.correctAnswer) correct++; });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const score = calculateScore();
    if (score >= meta.passingScore) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
  };

  const question    = quiz.questions[currentQ];
  const progress    = ((currentQ + 1) / quiz.questions.length) * 100;
  const answered    = Object.keys(answers).length;

  // ── Results screen ───────────────────────────────────────────────────────
  if (submitted) {
    const score   = calculateScore();
    const passed  = score >= meta.passingScore;
    const correct = quiz.questions.filter((q) => answers[q.id] === q.correctAnswer).length;

    return (
      <div className="container max-w-3xl py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <div className={`rounded-full p-6 w-fit mx-auto mb-6 ${passed ? "bg-success/10" : "bg-destructive/10"}`}>
            {passed
              ? <Trophy className="h-16 w-16 text-success" />
              : <XCircle className="h-16 w-16 text-destructive" />}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {passed ? "Congratulations!" : "Keep Practicing!"}
          </h1>
          <p className="text-muted-foreground">
            {passed
              ? `You passed the ${meta.label} quiz!`
              : `You need ${meta.passingScore}% to pass. Try again!`}
          </p>
        </motion.div>

        {/* Score summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border rounded-xl p-6 mb-6"
        >
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className={`text-4xl font-bold ${passed ? "text-success" : "text-destructive"}`}>{score}%</p>
              <p className="text-sm text-muted-foreground">Your Score</p>
            </div>
            <div>
              <p className="text-4xl font-bold">{correct}/{quiz.questions.length}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div>
              <p className={`text-4xl font-bold ${meta.color}`}>{meta.passingScore}%</p>
              <p className="text-sm text-muted-foreground">To Pass</p>
            </div>
          </div>
        </motion.div>

        {/* Answer review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4 mb-8"
        >
          <h2 className="text-xl font-bold">Review Your Answers</h2>
          {quiz.questions.map((q, i) => {
            const isCorrect = answers[q.id] === q.correctAnswer;
            return (
              <div
                key={q.id}
                className={`p-4 border rounded-lg ${
                  isCorrect
                    ? "border-success/50 bg-success/5"
                    : "border-destructive/50 bg-destructive/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  {isCorrect
                    ? <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                    : <XCircle    className="h-5 w-5 text-destructive mt-0.5 shrink-0" />}
                  <div className="flex-1">
                    <p className="font-medium mb-2">{i + 1}. {q.question}</p>
                    <p className="text-sm mb-1">
                      Your answer:{" "}
                      <span className={isCorrect ? "text-success" : "text-destructive"}>
                        {q.options[answers[q.id]] ?? "Not answered"}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p className="text-sm text-success">
                        Correct: {q.options[q.correctAnswer]}
                      </p>
                    )}
                    {q.explanation && (
                      <p className="text-sm text-muted-foreground mt-2">{q.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Different Difficulty
          </Button>
          <Button onClick={() => navigate(`/course/${courseId}/learn?lesson=${lessonId}`)}>
            <Home className="h-4 w-4 mr-2" />
            Back to Lesson
          </Button>
        </div>
      </div>
    );
  }

  // ── Quiz in progress ─────────────────────────────────────────────────────
  return (
    <div className="container max-w-3xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm text-muted-foreground">{lessonTitle}</p>
          <Badge className={`text-xs capitalize ${meta.bg} ${meta.color} border`}>
            {meta.label}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold">Lesson Quiz</h1>
      </div>

      {/* Progress + timer */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-2">
            <span>Question {currentQ + 1} of {quiz.questions.length}</span>
            <span>{answered} answered</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          timeLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-muted"
        }`}>
          <Clock className="h-4 w-4" />
          <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="border rounded-xl p-6 mb-6"
        >
          <h2 className="text-xl font-semibold mb-6">{question.question}</h2>
          <RadioGroup
            value={answers[question.id]?.toString()}
            onValueChange={(v) => handleAnswer(question.id, parseInt(v))}
            className="space-y-3"
          >
            {question.options.map((opt, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                  answers[question.id] === i
                    ? "border-accent bg-accent/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={i.toString()} id={`opt-${i}`} />
                <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentQ((p) => p - 1)} disabled={currentQ === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" />Previous
        </Button>
        {currentQ === quiz.questions.length - 1 ? (
          <Button onClick={handleSubmit} disabled={answered < quiz.questions.length}>
            Submit Quiz
          </Button>
        ) : (
          <Button onClick={() => setCurrentQ((p) => p + 1)}>
            Next<ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Question navigator */}
      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <p className="text-sm font-medium mb-3">Question Navigator</p>
        <div className="flex flex-wrap gap-2">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentQ(i)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                currentQ === i
                  ? "bg-accent text-accent-foreground"
                  : answers[q.id] !== undefined
                    ? "bg-success/20 text-success"
                    : "bg-muted hover:bg-muted/80"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { courseId, lessonId, quizId } = useParams<{
    courseId: string;
    lessonId?: string;
    quizId?:  string;
  }>();
  const navigate = useNavigate();

  const [quizzes, setQuizzes]           = useState<LessonQuiz[]>([]);
  const [lessonTitle, setLessonTitle]   = useState("");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<Difficulty | null>(null);

  // Resolve which lesson we're quizzing
  const resolvedLessonId = lessonId ?? quizId ?? "";

  useEffect(() => {
    if (!courseId || !resolvedLessonId) return;
    setLoading(true);

    // Fetch quizzes for this lesson from the course detail endpoint
    api
      .get(`/course/${courseId}/lesson/${resolvedLessonId}/quizzes`)
      .then((res) => {
        const data = res.data?.data ?? {};
        setLessonTitle(data.lessonTitle ?? "Lesson Quiz");
        // Map question ids if missing
        const mapped: LessonQuiz[] = (data.quizzes ?? []).map((q: any) => ({
          ...q,
          questions: (q.questions ?? []).map((qq: any, i: number) => ({
            ...qq,
            id: qq.id ?? `${q.id}-${i}`,
          })),
        }));
        setQuizzes(mapped);
      })
      .catch(() => setError("Could not load quiz."))
      .finally(() => setLoading(false));
  }, [courseId, resolvedLessonId]);

  if (loading) return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p>Loading quiz…</p>
      </div>
    </MainLayout>
  );

  if (error || quizzes.length === 0) return (
    <MainLayout>
      <div className="container max-w-xl py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
        <p className="text-lg font-semibold">{error ?? "No quiz available for this lesson yet."}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    </MainLayout>
  );

  const activeQuiz = selectedDiff
    ? quizzes.find((q) => q.difficulty === selectedDiff) ?? null
    : null;

  return (
    <MainLayout>
      {!selectedDiff || !activeQuiz ? (
        <DifficultyPicker
          quizzes={quizzes}
          lessonTitle={lessonTitle}
          onSelect={setSelectedDiff}
        />
      ) : (
        <QuizRunner
          quiz={activeQuiz}
          lessonTitle={lessonTitle}
          courseId={courseId!}
          lessonId={resolvedLessonId}
          onRetry={() => setSelectedDiff(null)}
        />
      )}
    </MainLayout>
  );
}