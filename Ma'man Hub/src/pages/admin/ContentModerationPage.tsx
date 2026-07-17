import { useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Flag,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  moderationService,
  type PendingCourse,
  type ReportedContentItem,
  type FlaggedComment,
} from "@/services/moderationService";

export default function ContentModerationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; courseId?: string }>({ open: false });
  const [rejectReason, setRejectReason] = useState("");
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; course?: PendingCourse }>({ open: false });

  const { data: stats } = useQuery({
    queryKey: ["moderation-stats"],
    queryFn: moderationService.getStats,
  });

  const { data: pendingCourses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["moderation-pending-courses"],
    queryFn: moderationService.getPendingCourses,
  });

  const { data: reportedContent = [], isLoading: loadingReports } = useQuery({
    queryKey: ["moderation-reported-content"],
    queryFn: moderationService.getReportedContent,
  });

  const { data: flaggedComments = [], isLoading: loadingComments } = useQuery({
    queryKey: ["moderation-flagged-comments"],
    queryFn: moderationService.getFlaggedComments,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["moderation-stats"] });
    queryClient.invalidateQueries({ queryKey: ["moderation-pending-courses"] });
    queryClient.invalidateQueries({ queryKey: ["moderation-reported-content"] });
    queryClient.invalidateQueries({ queryKey: ["moderation-flagged-comments"] });
  };

  const errorToast = (title: string) => (err: any) =>
    toast({ title, description: err?.response?.data?.message, variant: "destructive" });

  const approveCourseMutation = useMutation({
    mutationFn: moderationService.approveCourse,
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Course approved", description: "The course is now live on the platform." });
    },
    onError: errorToast("Couldn't approve course"),
  });

  const rejectCourseMutation = useMutation({
    mutationFn: ({ courseId, reason }: { courseId: string; reason: string }) =>
      moderationService.rejectCourse(courseId, reason),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Course rejected", description: "The instructor has been notified." });
      setRejectDialog({ open: false });
      setRejectReason("");
    },
    onError: errorToast("Couldn't reject course"),
  });

  const takeActionMutation = useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: "Dismissed" | "Warned" | "ContentRemoved" }) =>
      moderationService.takeAction(reportId, action),
    onSuccess: (_data, variables) => {
      invalidateAll();
      const messages = { Dismissed: "Report dismissed", Warned: "Warning sent to user", ContentRemoved: "Content removed" };
      toast({ title: messages[variables.action], description: "Action completed successfully." });
    },
    onError: errorToast("Couldn't complete action"),
  });

  const approveCommentMutation = useMutation({
    mutationFn: moderationService.approveComment,
    onSuccess: () => { invalidateAll(); toast({ title: "Comment approved" }); },
    onError: errorToast("Couldn't approve comment"),
  });

  const removeCommentMutation = useMutation({
    mutationFn: moderationService.removeComment,
    onSuccess: () => { invalidateAll(); toast({ title: "Comment removed" }); },
    onError: errorToast("Couldn't remove comment"),
  });

  const handleRejectCourse = () => {
    if (!rejectReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for rejection.", variant: "destructive" });
      return;
    }
    if (rejectDialog.courseId) {
      rejectCourseMutation.mutate({ courseId: rejectDialog.courseId, reason: rejectReason });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Content Moderation</h1>
          <p className="text-muted-foreground">Review and moderate platform content</p>
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="courses" className="relative">
              Pending Courses
              {(stats?.pendingCourses ?? 0) > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {stats?.pendingCourses}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reported" className="relative">
              Reported Content
              {(stats?.reportedContent ?? 0) > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {stats?.reportedContent}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="comments">
              Flagged Comments
              {(stats?.flaggedComments ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{stats?.flaggedComments}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Pending Courses Tab */}
          <TabsContent value="courses" className="space-y-4">
            {loadingCourses ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <>
                {pendingCourses.map((course, index) => (
                  <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          <img src={course.thumbnailUrl} alt={course.title} className="w-48 h-32 object-cover rounded-lg bg-muted" />
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="text-lg font-bold">{course.title}</h3>
                              <p className="text-sm text-muted-foreground">by {course.instructorName} • {course.category}</p>
                            </div>
                            <p className="text-sm line-clamp-2">{course.description}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>{course.totalLessons} lessons</span>
                              <span>{course.duration}</span>
                              <span>Submitted: {new Date(course.submittedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button variant="outline" onClick={() => setPreviewDialog({ open: true, course })}>
                              <Eye className="h-4 w-4 mr-2" /> Preview
                            </Button>
                            <Button
                              disabled={approveCourseMutation.isPending}
                              onClick={() => approveCourseMutation.mutate(course.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" /> Approve
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => setRejectDialog({ open: true, courseId: course.id })}
                            >
                              <XCircle className="h-4 w-4 mr-2" /> Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                {pendingCourses.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                    <h3 className="text-lg font-semibold">All caught up!</h3>
                    <p className="text-muted-foreground">No pending courses to review.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Reported Content Tab */}
          <TabsContent value="reported" className="space-y-4">
            {loadingReports ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : reportedContent.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                <h3 className="text-lg font-semibold">Nothing to review</h3>
                <p className="text-muted-foreground">No open content reports right now.</p>
              </div>
            ) : (
              reportedContent.map((report: ReportedContentItem, index) => (
                <motion.div key={report.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3 flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className="capitalize">{report.contentType}</Badge>
                            <Badge variant="destructive">
                              <Flag className="h-3 w-3 mr-1" />
                              {report.reportCount} report{report.reportCount === 1 ? "" : "s"}
                            </Badge>
                            <Badge variant="secondary">{report.reason}</Badge>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium mb-1">{report.contentTitle}</p>
                            <p className="text-sm text-muted-foreground">{report.description}</p>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                            <span>Reported by: {report.reportedByName}</span>
                            <span>Date: {new Date(report.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline" size="sm"
                            disabled={takeActionMutation.isPending}
                            onClick={() => takeActionMutation.mutate({ reportId: report.id, action: "Dismissed" })}
                          >
                            Dismiss
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            disabled={takeActionMutation.isPending}
                            onClick={() => takeActionMutation.mutate({ reportId: report.id, action: "Warned" })}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" /> Warn
                          </Button>
                          <Button
                            variant="destructive" size="sm"
                            disabled={takeActionMutation.isPending}
                            onClick={() => takeActionMutation.mutate({ reportId: report.id, action: "ContentRemoved" })}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Flagged Comments Tab */}
          <TabsContent value="comments" className="space-y-4">
            {loadingComments ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : flaggedComments.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                <h3 className="text-lg font-semibold">Nothing flagged</h3>
                <p className="text-muted-foreground">No flagged course comments right now.</p>
              </div>
            ) : (
              flaggedComments.map((comment: FlaggedComment, index) => (
                <motion.div key={comment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="font-medium">{comment.userName}</p>
                            {comment.isFlagged && (
                              <Badge variant="secondary"><Flag className="h-3 w-3 mr-1" /> Flagged</Badge>
                            )}
                          </div>
                          <p className="text-sm">{comment.content}</p>
                          <p className="text-xs text-muted-foreground">
                            On: {comment.courseName} • {new Date(comment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline" size="sm"
                            disabled={approveCommentMutation.isPending}
                            onClick={() => approveCommentMutation.mutate(comment.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            variant="destructive" size="sm"
                            disabled={removeCommentMutation.isPending}
                            onClick={() => removeCommentMutation.mutate(comment.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Reject Dialog */}
        <Dialog open={rejectDialog.open} onOpenChange={(open) => !rejectCourseMutation.isPending && setRejectDialog({ open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Course</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this course. The instructor will be notified.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog({ open: false })} disabled={rejectCourseMutation.isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRejectCourse} disabled={rejectCourseMutation.isPending}>
                {rejectCourseMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <Send className="h-4 w-4 mr-2" />}
                Send Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open })}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewDialog.course?.title}</DialogTitle>
              <DialogDescription>by {previewDialog.course?.instructorName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <img
                src={previewDialog.course?.thumbnailUrl}
                alt={previewDialog.course?.title}
                className="w-full h-48 object-cover rounded-lg bg-muted"
              />
              <p>{previewDialog.course?.description}</p>
              <div className="flex gap-4 text-sm items-center">
                <Badge variant="outline">{previewDialog.course?.category}</Badge>
                <span>{previewDialog.course?.totalLessons} lessons</span>
                <span>{previewDialog.course?.duration}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewDialog({ open: false })}>Close</Button>
              <Button
                disabled={approveCourseMutation.isPending}
                onClick={() => {
                  if (previewDialog.course) approveCourseMutation.mutate(previewDialog.course.id);
                  setPreviewDialog({ open: false });
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}