import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  CheckCircle2, Circle, HelpCircle, PlayCircle, Loader2,
  AlertCircle, Trophy, BookOpen, Clock, BarChart2, ChevronRight,
  Star, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  studentService,
  CourseCurriculum,
  QuizAttemptDto,
} from "@/services/studentService";

function formatSeconds(s: number) {
  if (!s || s === 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function DifficultyBadge({ d }: { d: string }) {
  const colors: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    hard: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[d] ?? "bg-muted"}`}>
      {d}
    </span>
  );
}

export default function CourseProgressPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [curriculum, setCurriculum] = useState<CourseCurriculum | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      studentService.getCourseCurriculum(courseId),
      studentService.getCourseQuizAttempts(courseId),
    ])
      .then(([cur, att]) => {
        setCurriculum(cur);
        setAttempts(att);
      })
      .catch(() => setError("Could not load progress data."))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p>Loading progress…</p>
      </div>
    </DashboardLayout>
  );

  if (error || !curriculum) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">{error ?? "Course not found."}</p>
        <Button variant="outline" onClick={() => navigate("/student/my-courses")}>
          My Courses
        </Button>
      </div>
    </DashboardLayout>
  );

  const pct = Math.round(curriculum.progressPercent ?? 0);
  const isComplete = pct === 100;
  const bestScoreByLesson: Record<string, number> = {};
  attempts.forEach((a) => {
    if (!bestScoreByLesson[a.lessonId] || a.score > bestScoreByLesson[a.lessonId]) {
      bestScoreByLesson[a.lessonId] = a.score;
    }
  });

  const avgQuizScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{curriculum.courseTitle}</h1>
            <p className="text-muted-foreground text-sm">Your learning progress</p>
          </div>
          <Button onClick={() => navigate(`/course/${courseId}/learn`)}>
            <PlayCircle className="h-4 w-4 mr-2" />
            {pct === 0 ? "Start Learning" : isComplete ? "Review Course" : "Continue"}
          </Button>
        </div>

        {/* Overall progress */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isComplete
                  ? <Trophy className="h-5 w-5 text-amber-500" />
                  : <TrendingUp className="h-5 w-5 text-primary" />}
                <span className="font-semibold">
                  {isComplete ? "Course Completed! 🎉" : "Course Progress"}
                </span>
              </div>
              <span className="text-2xl font-bold">{pct}%</span>
            </div>
            <Progress value={pct} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {curriculum.completedLessons} of {curriculum.totalLessons} lessons completed
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Lessons", value: `${curriculum.completedLessons}/${curriculum.totalLessons}`, icon: <BookOpen className="h-4 w-4" /> },
            { label: "Progress", value: `${pct}%`, icon: <BarChart2 className="h-4 w-4" /> },
            { label: "Quiz Attempts", value: attempts.length, icon: <HelpCircle className="h-4 w-4" /> },
            { label: "Avg Quiz Score", value: avgQuizScore != null ? `${avgQuizScore}%` : "—", icon: <Star className="h-4 w-4" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="border rounded-lg p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1 text-xs">
                {icon} {label}
              </div>
              <p className="text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs: Curriculum / Quiz History */}
        <Tabs defaultValue="curriculum">
          <TabsList className="mb-4">
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="quizzes">
              Quiz History {attempts.length > 0 && `(${attempts.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Curriculum breakdown */}
          <TabsContent value="curriculum">
            <Accordion type="multiple" defaultValue={curriculum.sections.map((s) => s.id)}>
              {curriculum.sections.map((section) => {
                const completed = section.lessons.filter((l) => l.isCompleted).length;
                const total = section.lessons.length;
                const sectionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <AccordionItem key={section.id} value={section.id} className="border rounded-xl mb-2 overflow-hidden">
                    <AccordionTrigger className="px-4 hover:no-underline bg-muted/30">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium text-sm">{section.title}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{completed}/{total}</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${sectionPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                      {section.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          onClick={() => navigate(`/course/${courseId}/learn?lessonId=${lesson.id}`)}
                          className="flex items-center justify-between px-4 py-3 border-t hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {lesson.isCompleted
                              ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                              : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm truncate">{lesson.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {lesson.duration > 0 && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatSeconds(lesson.duration)}
                                  </span>
                                )}
                                {lesson.quizzes && lesson.quizzes.length > 0 && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <HelpCircle className="h-3 w-3" />
                                    Quiz
                                  </span>
                                )}
                                {bestScoreByLesson[lesson.id] != null && (
                                  <span className="text-xs text-green-600 font-medium">
                                    Best: {bestScoreByLesson[lesson.id]}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>

          {/* Quiz History */}
          <TabsContent value="quizzes">
            {attempts.length === 0 ? (
              <div className="border border-dashed rounded-xl p-10 text-center">
                <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold mb-1">No quiz attempts yet</p>
                <p className="text-sm text-muted-foreground">
                  Take quizzes from the lesson player to track your scores here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {attempts.map((attempt) => {
                  const lessonTitle = curriculum.sections
                    .flatMap((s) => s.lessons)
                    .find((l) => l.id === attempt.lessonId)?.title ?? "Unknown Lesson";

                  return (
                    <div key={attempt.id} className="border rounded-lg p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate">{lessonTitle}</p>
                        <div className="flex items-center gap-2">
                          <DifficultyBadge d={attempt.difficulty} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(attempt.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold ${attempt.passed ? "text-green-600" : "text-red-500"}`}>
                          {Math.round(attempt.score)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attempt.correctAnswers}/{attempt.totalQuestions} correct
                        </p>
                        <Badge
                          variant="secondary"
                          className={`text-xs mt-0.5 ${attempt.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {attempt.passed ? "Passed" : "Failed"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
