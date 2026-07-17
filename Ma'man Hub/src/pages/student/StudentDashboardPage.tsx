import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Clock, Trophy, Target, Play, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { formatDistanceToNow } from "date-fns";
import { studentService } from "@/services/studentService";
import { userService } from "@/services/userService";
import { getMyStats, getMyBadges } from "@/services/leaderboardService";

export default function StudentDashboardPage() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: userService.getProfile,
  });

  const { data: enrolledCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["enrolled-courses"],
    queryFn: studentService.getEnrolledCourses,
  });

  const { data: myStats, isLoading: statsLoading } = useQuery({
    queryKey: ["leaderboard", "me"],
    queryFn: getMyStats,
    staleTime: 1000 * 60,
  });

  const { data: badges = [], isLoading: badgesLoading } = useQuery({
    queryKey: ["leaderboard", "badges"],
    queryFn: getMyBadges,
    staleTime: 1000 * 60 * 5,
  });

  const earnedBadges = badges.filter((b) => b.isEarned);
  const statsReady = !profileLoading && !statsLoading;

  // ── Derived ───────────────────────────────────────────────────────────────
  const continueLearning = [...enrolledCourses]
    .filter((c) => c.progressPercent < 100)
    .sort((a, b) => {
      if (!a.lastAccessedAt) return 1;
      if (!b.lastAccessedAt) return -1;
      return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
    })
    .slice(0, 4);

  const stats = [
    {
      label: "Hours Learned",
      value: `${profile?.totalHoursLearned ?? 0}`,
      icon: Clock, color: "text-info",
    },
    {
      label: "Courses Completed",
      value: `${myStats?.coursesCompleted ?? 0}`,
      icon: BookOpen, color: "text-success",
    },
    {
      label: "Achievements",
      value: `${earnedBadges.length}`,
      icon: Trophy, color: "text-warning",
    },
    {
      label: "Current Streak",
      value: `${myStats?.currentStreak ?? 0} day${myStats?.currentStreak === 1 ? "" : "s"}`,
      icon: Target, color: "text-accent",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-display">
            Welcome back{profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Continue your learning journey
          </p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}
                    >
                      <stat.icon className="h-6 w-6" />
                    </div>
                    <div>
                      {statsReady ? (
                        <p className="text-2xl font-bold">{stat.value}</p>
                      ) : (
                        <div className="h-7 w-10 bg-muted rounded animate-pulse mb-0.5" />
                      )}
                      <p className="text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Continue Learning */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Continue Learning</h2>
            <Link to="/my-courses">
              <Button variant="ghost">View All</Button>
            </Link>
          </div>

          {coursesLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="flex">
                    <div className="w-32 shrink-0 bg-muted" />
                    <CardContent className="flex-1 p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-2 bg-muted rounded w-full mt-3" />
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          ) : continueLearning.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {continueLearning.map((course) => (
                <Card
                  key={course.id}
                  className="overflow-hidden course-card-hover"
                >
                  <div className="flex">
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-32 h-full object-cover"
                    />
                    <CardContent className="flex-1 p-4">
                      <h3 className="font-semibold line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {course.lastAccessedAt
                          ? `Last accessed: ${formatDistanceToNow(new Date(course.lastAccessedAt), { addSuffix: true })}`
                          : `By ${course.instructorName}`}
                      </p>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{course.progressPercent}% complete</span>
                        </div>
                        <Progress value={course.progressPercent} className="h-2" />
                      </div>
                      <Link to={`/course/${course.courseId}/learn`}>
                        <Button size="sm" className="mt-3">
                          <Play className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                      </Link>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border">
              <CardContent className="py-10 text-center">
                <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground mb-3">
                  {enrolledCourses.length > 0
                    ? "You've completed all your enrolled courses! 🎉"
                    : "You haven't enrolled in any courses yet."}
                </p>
                <Link to="/categories">
                  <Button size="sm" variant="outline">Browse Courses</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Achievements */}
        <div>
          <h2 className="text-xl font-bold mb-4">Recent Achievements</h2>

          {badgesLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 text-center animate-pulse">
                  <div className="h-16 w-16 rounded-full bg-muted mb-2 mx-auto" />
                  <div className="h-3 w-14 bg-muted rounded mx-auto" />
                </div>
              ))}
            </div>
          ) : earnedBadges.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {earnedBadges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex-shrink-0 text-center w-20"
                  title={badge.description}
                >
                  <div className="h-16 w-16 rounded-full gradient-accent flex items-center justify-center mb-2 mx-auto text-2xl leading-none">
                    {badge.icon || <Award className="h-8 w-8 text-accent-foreground" />}
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{badge.name}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border">
              <CardContent className="py-8 text-center">
                <Award className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No achievements yet — complete lessons and quizzes to start earning badges!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}