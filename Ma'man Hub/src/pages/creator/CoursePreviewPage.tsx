import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft, Eye, EyeOff, Layers, PlayCircle, Users, Star,
  HelpCircle, CheckCircle2, Loader2, AlertCircle, Globe,
  FileText, LayoutGrid, BookOpen, DollarSign, Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

// ── Types (mirrors CourseManagementDetailDto) ─────────────────────────────────

interface Quiz {
  id: string;
  difficulty: string;
  questions: { question: string; options: string[]; correctAnswer: number }[];
}

interface Lesson {
  id: string;
  title: string;
  duration: number;
  order: number;
  isFree: boolean;
  isPublished: boolean;
  hasVideo: boolean;
  materialsCount: number;
  hasQuiz: boolean;
  quizzes?: Quiz[];
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
}

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  price: number;
  discountPrice: number | null;
  ageGroup: string;
  language: string;
  isPublished: boolean;
  rating: number;
  totalStudents: number;
  totalSections: number;
  totalLessons: number;
  sections: Section[];
}

function formatDuration(s: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const DIFF_COLORS: Record<string, string> = {
  easy:   "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard:   "bg-red-100   text-red-700",
};

// ── Creator-view: full structured breakdown ───────────────────────────────────

function CreatorView({ course, onPublish, publishing }: {
  course: CourseDetail;
  onPublish: (publish: boolean) => void;
  publishing: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sections",  value: course.totalSections, icon: <Layers className="h-4 w-4" /> },
          { label: "Lessons",   value: course.totalLessons,  icon: <PlayCircle className="h-4 w-4" /> },
          { label: "Students",  value: course.totalStudents, icon: <Users className="h-4 w-4" /> },
          { label: "Price",     value: `$${(course.discountPrice ?? course.price).toFixed(2)}`, icon: <DollarSign className="h-4 w-4" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="border rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              {icon}
              <span className="text-xs">{label}</span>
            </div>
            <p className="text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {course.description && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Description</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{course.description}</p></CardContent>
        </Card>
      )}

      {/* Curriculum */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Curriculum
        </h2>

        <Accordion type="multiple" className="border rounded-xl overflow-hidden">
          {course.sections.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-semibold">{section.title}</span>
                  <span className="text-sm text-muted-foreground">{section.lessons.length} lessons</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0">
                {section.lessons.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No lessons yet.</p>
                ) : (
                  <ul className="divide-y">
                    {section.lessons.map((lesson) => (
                      <li key={lesson.id} className="px-4 py-3 space-y-2">
                        {/* Lesson row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PlayCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium">{lesson.title}</span>
                            {lesson.isFree && (
                              <Badge variant="secondary" className="text-xs">Free</Badge>
                            )}
                            {!lesson.isPublished && (
                              <Badge variant="secondary" className="text-xs bg-muted">Draft</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {lesson.hasVideo && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                            <span>{formatDuration(lesson.duration)}</span>
                          </div>
                        </div>

                        {/* Quiz breakdown — keyed by difficulty since the DTO
                            doesn't carry a stable per-quiz-set id */}
                        {lesson.quizzes && lesson.quizzes.length > 0 && (
                          <div className="ml-6 flex flex-wrap gap-1.5">
                            {lesson.quizzes.map((quiz) => (
                              <span
                                key={quiz.difficulty}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${DIFF_COLORS[quiz.difficulty] ?? "bg-muted text-muted-foreground"}`}
                              >
                                <HelpCircle className="h-3 w-3" />
                                {quiz.difficulty} ({quiz.questions.length} Qs)
                              </span>
                            ))}
                          </div>
                        )}
                        {lesson.hasQuiz && (!lesson.quizzes || lesson.quizzes.length === 0) && (
                          <div className="ml-6">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <HelpCircle className="h-3 w-3" /> Quiz attached
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Publish button */}
      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          onClick={() => onPublish(!course.isPublished)}
          disabled={publishing}
          className={course.isPublished ? "bg-muted text-foreground hover:bg-muted/80" : ""}
        >
          {publishing
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : course.isPublished
              ? <EyeOff className="h-4 w-4 mr-2" />
              : <Globe className="h-4 w-4 mr-2" />}
          {course.isPublished ? "Unpublish Course" : "Publish Course"}
        </Button>
      </div>
    </div>
  );
}

// ── Student-view: mirrors what the student sees on CourseDetailPage ───────────

function StudentView({ course }: { course: CourseDetail }) {
  const totalLessons   = course.sections.reduce((a, s) => a + s.lessons.length, 0);
  const freeLessons    = course.sections
    .flatMap((s) => s.lessons)
    .filter((l) => l.isFree).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-xl overflow-hidden bg-gradient-to-r from-primary/10 to-accent/10 p-6 flex gap-6">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title}
            className="w-48 h-32 object-cover rounded-lg shrink-0" />
        ) : (
          <div className="w-48 h-32 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-2 flex-1">
          <h2 className="text-xl font-bold">{course.title}</h2>
          <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {course.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                {course.rating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> {course.totalStudents} students
            </span>
            <span className="flex items-center gap-1">
              <PlayCircle className="h-4 w-4" /> {totalLessons} lessons
            </span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-2xl font-bold">
              ${(course.discountPrice ?? course.price).toFixed(2)}
            </span>
            {course.discountPrice && (
              <span className="text-sm line-through text-muted-foreground">
                ${course.price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* What students see: curriculum accordion */}
      <div>
        <h3 className="font-semibold mb-3">Course Content</h3>
        <p className="text-sm text-muted-foreground mb-3">
          {course.totalSections} sections · {totalLessons} lessons · {freeLessons} free preview
        </p>
        <Accordion type="multiple" className="border rounded-xl">
          {course.sections.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-medium">{section.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {section.lessons.length} lessons
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0">
                <ul className="divide-y">
                  {section.lessons.map((lesson) => (
                    <li key={lesson.id}
                      className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lesson.title}</span>
                        {lesson.isFree && (
                          <Badge variant="outline" className="text-xs">Preview</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {lesson.hasQuiz && (
                          <span className="flex items-center gap-1">
                            <HelpCircle className="h-3.5 w-3.5" /> Quiz
                          </span>
                        )}
                        <span>{formatDuration(lesson.duration)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CoursePreviewPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate     = useNavigate();
  const { toast }    = useToast();

  const [course, setCourse]       = useState<CourseDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [viewMode, setViewMode]   = useState<"creator" | "student">("creator");
  const [publishing, setPublishing] = useState(false);

  const fetchCourse = () => {
    if (!courseId) return;
    setLoading(true);
    api
      .get(`/coursecreator/courses/${courseId}/management`)
      .then((res) => setCourse(res.data?.data ?? null))
      .catch(() => setError("Could not load course"))
      .finally(() => setLoading(false));
  };

  useEffect(fetchCourse, [courseId]);

  const handlePublish = async (publish: boolean) => {
    setPublishing(true);
    try {
      await api.post(`/coursecreator/courses/${courseId}/publish`, { publish });
      toast({ title: publish ? "Course published 🎉" : "Course unpublished" });
      fetchCourse();
    } catch {
      toast({ title: "Failed to update publish status", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p>Loading course…</p>
      </div>
    </DashboardLayout>
  );

  if (error || !course) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">{error ?? "Course not found"}</p>
        <Button variant="outline" onClick={() => navigate("/creator/my-courses")}>Back</Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6 pb-12">

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/creator/courses/${courseId}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Course
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                className={course.isPublished ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}
              >
                {course.isPublished ? <><Eye className="h-3 w-3 mr-1" />Published</> : <><EyeOff className="h-3 w-3 mr-1" />Draft</>}
              </Badge>
            </div>
          </div>

          <div className="flex border rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode("creator")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "creator" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Creator View
            </button>
            <button
              onClick={() => setViewMode("student")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors border-l ${
                viewMode === "student" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Student Preview
            </button>
          </div>
        </div>

        {viewMode === "student" && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <Eye className="h-4 w-4 shrink-0" />
            You are previewing this course as a student would see it.
          </div>
        )}

        {viewMode === "creator" ? (
          <CreatorView course={course} onPublish={handlePublish} publishing={publishing} />
        ) : (
          <StudentView course={course} />
        )}
      </div>
    </DashboardLayout>
  );
}