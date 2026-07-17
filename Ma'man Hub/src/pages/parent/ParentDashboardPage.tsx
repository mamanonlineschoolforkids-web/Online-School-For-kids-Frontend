import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  BookOpen,
  Trophy,
  Clock,
  TrendingUp,
  Bell,
  Eye,
  Plus,
  ArrowRight,
  Star,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { parentService } from "@/services/parentService";
import { formatDistanceToNow } from "date-fns";

const CHILD_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary)/0.5)",
  "hsl(200, 80%, 55%)",
  "hsl(30, 90%, 55%)",
];

export default function ParentDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["parent-dashboard-stats"],
    queryFn: parentService.getDashboardStats,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p>Loading dashboard…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p>Couldn't load your dashboard. Please try again.</p>
        </div>
      </DashboardLayout>
    );
  }

  const children = data.children;
  const totalCourses = children.reduce((sum, c) => sum + c.coursesEnrolled, 0);
  const totalHoursThisWeek = Math.round(children.reduce((sum, c) => sum + c.hoursThisWeek, 0) * 10) / 10;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Parent Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your children's learning progress
            </p>
          </div>
          <Button asChild>
            <Link to="/parent/children">
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </Link>
          </Button>
        </div>

        {children.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Users className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">No children linked yet</p>
              <p className="text-sm text-muted-foreground">
                Link a child's account to start tracking their learning progress.
              </p>
              <Button asChild className="mt-2">
                <Link to="/parent/children">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Child
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Children
                      </p>
                      <p className="text-2xl font-bold">{children.length}</p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Courses</p>
                      <p className="text-2xl font-bold">{totalCourses}</p>
                    </div>
                    <div className="rounded-full bg-blue-500/10 p-3">
                      <BookOpen className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Hours This Week
                      </p>
                      <p className="text-2xl font-bold">{totalHoursThisWeek}</p>
                    </div>
                    <div className="rounded-full bg-green-500/10 p-3">
                      <Clock className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Achievements</p>
                      <p className="text-2xl font-bold">{data.recentAchievements.length}</p>
                    </div>
                    <div className="rounded-full bg-yellow-500/10 p-3">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Children Overview */}
            <div className="grid gap-6 lg:grid-cols-2">
              {children.map((child) => (
                <Card key={child.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={child.avatarUrl} />
                          <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{child.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Age: {child.age}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/parent/children">
                          <Eye className="mr-2 h-4 w-4" />
                          Manage
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <BookOpen className="mx-auto h-5 w-5 text-primary" />
                        <p className="mt-1 text-lg font-bold">
                          {child.coursesEnrolled}
                        </p>
                        <p className="text-xs text-muted-foreground">Courses</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <Clock className="mx-auto h-5 w-5 text-blue-500" />
                        <p className="mt-1 text-lg font-bold">
                          {child.hoursThisWeek}h
                        </p>
                        <p className="text-xs text-muted-foreground">This Week</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <Star className="mx-auto h-5 w-5 text-yellow-500" />
                        <p className="mt-1 text-lg font-bold">{child.streak}</p>
                        <p className="text-xs text-muted-foreground">Day Streak</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Overall Progress</span>
                        <span className="font-medium">
                          {child.overallProgress}%
                        </span>
                      </div>
                      <Progress value={child.overallProgress} className="h-2" />
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        Recent Activity
                      </p>
                      <p className="text-sm font-medium">
                        {child.recentActivity ?? "No activity yet"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts and Activity */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Weekly Progress Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Weekly Learning Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.weeklyHoursChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis dataKey="day" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        {children.map((child, i) => (
                          <Bar
                            key={child.id}
                            dataKey={child.id}
                            name={child.name}
                            fill={CHILD_COLORS[i % CHILD_COLORS.length]}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                  ) : (
                    data.recentActivity.map((activity, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        <div className="rounded-full p-2 bg-blue-500/10">
                          <BookOpen className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.childName} · {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Achievements */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Recent Achievements
                </CardTitle>
                <Button variant="link" size="sm" asChild>
                  <Link to="/leaderboard">
                    View All <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.recentAchievements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No achievements earned yet.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {data.recentAchievements.map((achievement, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 rounded-lg border p-4"
                      >
                        <span className="text-3xl">{achievement.icon}</span>
                        <div>
                          <p className="font-medium">{achievement.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {achievement.childName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}