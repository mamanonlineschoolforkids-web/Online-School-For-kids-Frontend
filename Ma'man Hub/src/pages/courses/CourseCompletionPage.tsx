import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Trophy, Sparkles, ArrowRight, LayoutDashboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { studentService } from "@/services/studentService";
import { getMyStats } from "@/services/leaderboardService";

interface CompletionState {
  courseTitle?: string;
  pointsEarned?: number;
  totalPoints?: number;
}

export default function CourseCompletionPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const passedState = (location.state ?? {}) as CompletionState;

  const [courseTitle, setCourseTitle] = useState(passedState.courseTitle ?? "");
  const [pointsEarned, setPointsEarned] = useState(passedState.pointsEarned ?? 0);
  const [totalPoints, setTotalPoints] = useState(passedState.totalPoints ?? 0);
  const [loading, setLoading] = useState(
    passedState.totalPoints === undefined || !passedState.courseTitle
  );

  // Fall back to fresh data if the page was reached directly (e.g. refresh,
  // shared link) rather than via the "course completed" navigation.
  useEffect(() => {
    if (!loading || !courseId) return;

    (async () => {
      try {
        const [curriculum, stats] = await Promise.all([
          passedState.courseTitle ? null : studentService.getCourseCurriculum(courseId),
          passedState.totalPoints === undefined ? getMyStats() : null,
        ]);
        if (curriculum) setCourseTitle(curriculum.courseTitle);
        if (stats) setTotalPoints(stats.totalPoints);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, loading, passedState.courseTitle, passedState.totalPoints]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 via-background to-background px-4 py-12 relative overflow-hidden">
      {/* Decorative sparkles */}
      <Sparkles className="absolute top-10 left-[15%] h-6 w-6 text-primary/40 animate-pulse" />
      <Sparkles className="absolute top-24 right-[20%] h-8 w-8 text-primary/30 animate-pulse [animation-delay:.3s]" />
      <Sparkles className="absolute bottom-20 left-[25%] h-5 w-5 text-primary/40 animate-pulse [animation-delay:.6s]" />

      <div className="max-w-md w-full text-center space-y-6 bg-card border rounded-2xl shadow-lg p-8">
        <div className="mx-auto bg-primary/10 rounded-full p-5 w-fit">
          <Trophy className="h-12 w-12 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Congratulations! 🎉</h1>
          <p className="text-muted-foreground">
            You've completed{courseTitle ? <> <span className="font-medium text-foreground">{courseTitle}</span></> : " the course"}!
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-5 space-y-3">
          {pointsEarned > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Points earned this session</span>
              <span className="font-semibold text-primary">+{pointsEarned}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total points</span>
            <span className="text-2xl font-bold text-primary tabular-nums">{totalPoints.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button className="w-full" onClick={() => navigate("/leaderboard")}>
            View Leaderboard
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/student/my-courses">
              <LayoutDashboard className="h-4 w-4 mr-1.5" />
              Back to My Courses
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}