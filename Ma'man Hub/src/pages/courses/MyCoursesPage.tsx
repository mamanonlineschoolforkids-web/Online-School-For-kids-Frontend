import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Search, BookOpen, PlayCircle, Star, Users, Loader2,
  AlertCircle, ChevronRight, Clock, Trophy,
} from "lucide-react";
import { studentService, EnrolledCourse } from "@/services/studentService";

function formatProgress(pct: number) {
  if (pct === 0) return "Not started";
  if (pct === 100) return "Completed";
  return `${Math.round(pct)}% complete`;
}

function EnrolledCourseCard({ course }: { course: EnrolledCourse }) {
  const navigate = useNavigate();
  const pct = Math.round(course.progressPercent ?? 0);
  const isComplete = pct === 100;
  const isStarted = pct > 0;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
      onClick={() => navigate(`/course/${course.courseId}/learn`)}>
      <div className="flex gap-0">
        {/* Thumbnail */}
        <div className="relative w-48 shrink-0">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-[120px] bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-primary/40" />
            </div>
          )}
          {isComplete && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-yellow-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-4 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {course.title}
              </h3>
              {isComplete && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 shrink-0 text-xs">
                  Completed
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{course.instructorName}</p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {course.rating?.toFixed(1) ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {course.totalStudents ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <PlayCircle className="h-3 w-3" />
                {course.completedLessons ?? 0}/{course.totalLessons ?? 0} lessons
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${isComplete ? "text-green-600" : isStarted ? "text-primary" : "text-muted-foreground"}`}>
                {formatProgress(pct)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <Progress
              value={pct}
              className="h-1.5"
            />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default function MyCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in-progress" | "completed" | "not-started">("all");

  useEffect(() => {
    studentService
      .getEnrolledCourses()
      .then(setCourses)
      .catch(() => setError("Could not load your courses."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.instructorName.toLowerCase().includes(search.toLowerCase());
    const pct = c.progressPercent ?? 0;
    const matchFilter =
      filter === "all" ||
      (filter === "completed" && pct === 100) ||
      (filter === "in-progress" && pct > 0 && pct < 100) ||
      (filter === "not-started" && pct === 0);
    return matchSearch && matchFilter;
  });

  const stats = {
    total: courses.length,
    completed: courses.filter((c) => (c.progressPercent ?? 0) === 100).length,
    inProgress: courses.filter((c) => {
      const p = c.progressPercent ?? 0;
      return p > 0 && p < 100;
    }).length,
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p>Loading your courses…</p>
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => navigate("/courses")}>Browse Courses</Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">My Learning</h1>
          <p className="text-muted-foreground text-sm">
            {stats.total} courses enrolled · {stats.completed} completed · {stats.inProgress} in progress
          </p>
        </div>

        {/* Stats */}
        {courses.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Enrolled", value: stats.total, icon: <BookOpen className="h-4 w-4" /> },
              { label: "In Progress", value: stats.inProgress, icon: <Clock className="h-4 w-4" /> },
              { label: "Completed", value: stats.completed, icon: <Trophy className="h-4 w-4" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="border rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  {icon}
                  <span className="text-xs">{label}</span>
                </div>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your courses…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "in-progress", "completed", "not-started"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f === "all" ? "All" : f === "in-progress" ? "In Progress" :
                 f === "completed" ? "Completed" : "Not Started"}
              </Button>
            ))}
          </div>
        </div>

        {/* Course list */}
        {filtered.length === 0 ? (
          <div className="border border-dashed rounded-xl p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">
              {courses.length === 0 ? "No courses yet" : "No courses match your search"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {courses.length === 0
                ? "Start learning by enrolling in a course."
                : "Try a different search or filter."}
            </p>
            {courses.length === 0 && (
              <Button onClick={() => navigate("/courses")}>Browse Courses</Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((course) => (
              <EnrolledCourseCard key={course.id ?? course.courseId} course={course} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
