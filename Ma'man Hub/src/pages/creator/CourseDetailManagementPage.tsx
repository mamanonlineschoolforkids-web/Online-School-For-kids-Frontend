import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertCircle, Layers, PlayCircle, Users, Star,
  Eye, EyeOff, Video, Plus, Scissors, Pencil, HelpCircle,
  ChevronRight, Trash2, Youtube, Clapperboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { courseService, CourseManagementDetailDto, ManagementSectionDto } from "@/services/courseService";
import { videoProcessingService } from "@/services/videoProcessingService";
import CourseSettingsTab from "@/components/ui/CourseSettingsTab";

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Dialog: Add / Edit Section ────────────────────────────────────────────────

function SectionDialog({
  open,
  onClose,
  courseId,
  onSaved,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  onSaved: () => void;
  existing?: ManagementSectionDto;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setTitle(existing?.title ?? ""); }, [existing]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (existing) {
        await courseService.updateSection(courseId, existing.id, {
          title,
          description: existing.description ?? "",
          order: existing.order,
        });
      } else {
        await courseService.createSection({ courseId, title, order: 0 });
      }
      toast({ title: existing ? "Section updated" : "Section created" });
      onSaved();
      onClose();
    } catch {
      toast({ title: "Failed to save section", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Section" : "New Section"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Section Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Week 1 – Foundations"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            {existing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog: Choose how to add a lesson (4 options) ────────────────────────────

type AddLessonStep = "choose" | "youtube-link" | "processing";
type AddLessonOption = "chunked-upload" | "chunked-youtube" | "single-upload" | "single-youtube";

function AddLessonDialog({
  open,
  onClose,
  courseId,
  sectionId,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  sectionId: string;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<AddLessonStep>("choose");
  const [pendingOption, setPendingOption] = useState<AddLessonOption | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [starting, setStarting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!starting) return;
    setElapsedSeconds(0);
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [starting]);

  const reset = () => {
    setStep("choose");
    setPendingOption(null);
    setYoutubeUrl("");
  };

  const handleClose = () => {
    if (starting) return; // don't allow closing mid-processing
    reset();
    onClose();
  };

  const isValidYoutubeUrl = (url: string) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/.test(url);

  const handleFilePicked = async (option: "chunked-upload" | "single-upload", file: File) => {
    setStarting(true);
    setStep("processing");
    try {
      if (option === "chunked-upload") {
        const jobId = await videoProcessingService.startChunkedFromUpload(courseId, sectionId, file);
        navigate(`/creator/courses/${courseId}/chunk-review/${jobId}`);
      } else {
        const jobId = await videoProcessingService.startSingleFromUpload(courseId, sectionId, file);
        navigate(`/creator/courses/${courseId}/single-lesson-review/${jobId}`);
      }
      reset();
      onClose();
    } catch (err: any) {
      toast({
        title: "Processing failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
      setStep("choose");
    } finally {
      setStarting(false);
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!pendingOption || !isValidYoutubeUrl(youtubeUrl)) {
      toast({ title: "Enter a valid YouTube URL", variant: "destructive" });
      return;
    }
    setStarting(true);
    setStep("processing");
    try {
      if (pendingOption === "chunked-youtube") {
        const jobId = await videoProcessingService.startChunkedFromYoutube(courseId, sectionId, youtubeUrl);
        navigate(`/creator/courses/${courseId}/chunk-review/${jobId}`);
      } else {
        const jobId = await videoProcessingService.startSingleFromYoutube(courseId, sectionId, youtubeUrl);
        navigate(`/creator/courses/${courseId}/single-lesson-review/${jobId}`);
      }
      reset();
      onClose();
    } catch (err: any) {
      toast({
        title: "Processing failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
      setStep("choose");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "choose" && "Add Lesson Content"}
            {step === "youtube-link" && "Paste YouTube Link"}
            {step === "processing" && "Processing"}
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              How do you want to add content to this section?
            </p>

            <OptionRow
              icon={<Scissors className="h-5 w-5 text-violet-600" />}
              iconBg="bg-violet-100"
              title="Upload a long video (split into lessons)"
              description="The AI transcribes and splits your video into multiple chunks. You adjust each chunk's boundaries, then generate a quiz for each one."
              disabled={starting}
              onFile={(file) => handleFilePicked("chunked-upload", file)}
              accept="video/*"
            />

            <OptionRow
              icon={<Youtube className="h-5 w-5 text-red-600" />}
              iconBg="bg-red-100"
              title="Paste a long YouTube link (split into lessons)"
              description="Same as above, but from a YouTube video instead of an upload."
              disabled={starting}
              onClick={() => { setPendingOption("chunked-youtube"); setStep("youtube-link"); }}
            />

            <OptionRow
              icon={<Clapperboard className="h-5 w-5 text-primary" />}
              iconBg="bg-primary/10"
              title="Upload a short video (one lesson)"
              description="This video becomes a single lesson. The AI transcribes it — no splitting — then you generate its quiz."
              disabled={starting}
              onFile={(file) => handleFilePicked("single-upload", file)}
              accept="video/*"
            />

            <OptionRow
              icon={<Youtube className="h-5 w-5 text-red-600" />}
              iconBg="bg-red-100"
              title="Paste a short YouTube link (one lesson)"
              description="Same as above, but from a YouTube video instead of an upload."
              disabled={starting}
              onClick={() => { setPendingOption("single-youtube"); setStep("youtube-link"); }}
            />
          </div>
        )}

        {step === "youtube-link" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="yt-url">YouTube URL</Label>
              <Input
                id="yt-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={starting}
                autoFocus
              />
              {youtubeUrl && !isValidYoutubeUrl(youtubeUrl) && (
                <p className="text-xs text-destructive">Please enter a valid YouTube URL.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("choose")} disabled={starting}>
                Back
              </Button>
              <Button
                onClick={handleYoutubeSubmit}
                disabled={starting || !isValidYoutubeUrl(youtubeUrl)}
              >
                {starting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <p className="font-semibold">Processing your video…</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Transcribing{pendingOption?.startsWith("chunked") ? " and splitting into lessons" : ""} — this can take a few minutes depending on video length. Don't close this window.
              </p>
            </div>
            <p className="text-2xl font-mono font-semibold text-primary tabular-nums">
              {formatDuration(elapsedSeconds)}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-component: one selectable row in the AddLessonDialog ──────────────────

function OptionRow({
  icon,
  iconBg,
  title,
  description,
  disabled,
  onClick,
  onFile,
  accept,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  disabled?: boolean;
  onClick?: () => void;
  onFile?: (file: File) => void;
  accept?: string;
}) {
  const inputId = `option-file-${title.replace(/\s+/g, "-")}`;

  const content = (
    <>
      <div className={`${iconBg} rounded-lg p-2.5 shrink-0`}>{icon}</div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 ml-auto" />
    </>
  );

  const className =
    "w-full flex items-start gap-4 border rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition-colors text-left disabled:opacity-50 disabled:pointer-events-none";

  if (onFile) {
    return (
      <label htmlFor={inputId} className={`${className} cursor-pointer block`}>
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        <div className="flex items-start gap-4">{content}</div>
      </label>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CourseDetailManagementPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [course, setCourse] = useState<CourseManagementDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTab = searchParams.get("tab") ?? "overview";

  const [sectionDialog, setSectionDialog] = useState<{
    open: boolean; existing?: ManagementSectionDto;
  }>({ open: false });

  const [lessonDialog, setLessonDialog] = useState<{
    open: boolean; sectionId: string;
  }>({ open: false, sectionId: "" });

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchCourse = () => {
    if (!courseId) return;
    setLoading(true);
    courseService
      .getCourseManagementDetail(courseId)
      .then(setCourse)
      .catch(() => setError("Could not load this course."))
      .finally(() => setLoading(false));
  };

  useEffect(fetchCourse, [courseId]);

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm("Delete this section and all its lessons?")) return;
    try {
      await courseService.deleteSection(courseId!, sectionId);
      toast({ title: "Section deleted" });
      fetchCourse();
    } catch {
      toast({ title: "Failed to delete section", variant: "destructive" });
    }
  };

  const handleDeleteLesson = async (sectionId: string, lessonId: string) => {
    if (!window.confirm("Delete this lesson?")) return;
    try {
      await courseService.deleteLesson(courseId!, sectionId, lessonId);
      toast({ title: "Lesson deleted" });
      fetchCourse();
    } catch {
      toast({ title: "Failed to delete lesson", variant: "destructive" });
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Loading course…</p>
      </div>
    </DashboardLayout>
  );

  if (error || !course) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">{error ?? "Course not found."}</p>
        <Button variant="outline" onClick={() => navigate("/creator/my-courses")}>
          Back to My Courses
        </Button>
      </div>
    </DashboardLayout>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <Button variant="ghost" size="sm" className="-ml-2"
          onClick={() => navigate("/creator/my-courses")}>
          <ArrowLeft className="h-4 w-4 mr-2" />My Courses
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <Badge variant="secondary"
                className={course.isPublished
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"}>
                {course.isPublished
                  ? <><Eye className="h-3 w-3 mr-1" />Published</>
                  : <><EyeOff className="h-3 w-3 mr-1" />Draft</>}
              </Badge>
            </div>
            {course.subtitle && (
              <p className="text-muted-foreground max-w-2xl">{course.subtitle}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Layers className="h-4 w-4" /> {course.totalSections} sections
              </span>
              <span className="flex items-center gap-1">
                <PlayCircle className="h-4 w-4" /> {course.totalLessons} lessons
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {course.totalStudents} students
              </span>
              {course.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  {course.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <Button variant="outline" onClick={() => navigate(`/creator/courses/${courseId}/preview`)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview & Publish
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(tab) => setSearchParams({ tab })} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <p className="text-2xl font-bold">
                  ${(course.discountPrice ?? course.price).toFixed(2)}
                </p>
                {course.discountPrice && (
                  <p className="text-sm text-muted-foreground line-through">${course.price.toFixed(2)}</p>
                )}
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Language</p>
                <p className="text-lg font-medium">{course.language}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Age Group</p>
                <p className="text-lg font-medium">{course.ageGroup}</p>
              </div>
            </div>

            {course.whatYoullLearn.length > 0 && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-semibold mb-2">What students will learn</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {course.whatYoullLearn.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* ── Curriculum ── */}
          <TabsContent value="curriculum" className="space-y-4">

            <div className="flex justify-end">
              <Button size="sm" onClick={() => setSectionDialog({ open: true })}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Section
              </Button>
            </div>

            {course.sections.length === 0 ? (
              <div className="border border-dashed rounded-xl p-10 text-center">
                <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No sections yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create sections to organize your lessons.
                </p>
                <Button onClick={() => setSectionDialog({ open: true })}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add First Section
                </Button>
              </div>
            ) : (
              <Accordion type="multiple" className="border rounded-xl">
                {course.sections.map((section) => (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold text-left">{section.title}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {section.lessons.length} lessons
                          </span>
                          <div className="flex gap-1">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSectionDialog({ open: true, existing: section });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  setSectionDialog({ open: true, existing: section });
                                }
                              }}
                              className="h-7 w-7 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </div>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSection(section.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  handleDeleteSection(section.id);
                                }
                              }}
                              className="h-7 w-7 p-0 inline-flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-0">
                      {section.lessons.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">
                          No lessons yet.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {section.lessons.map((lesson) => {
                            // Derived from full quiz content, not a removed
                            // quizDifficulties field — counts only difficulty
                            // levels that actually have at least one question.
                            const quizLevelsWithContent = lesson.quizzes.filter(
                              (q) => q.questions.length > 0
                            ).length;

                            return (
                              <li key={lesson.id}
                                className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {lesson.hasVideo
                                    ? <PlayCircle className="h-4 w-4 text-accent" />
                                    : <Video className="h-4 w-4 text-muted-foreground" />}
                                  <span className="text-sm">{lesson.title}</span>
                                  {lesson.isFree && (
                                    <Badge variant="secondary" className="text-xs">Free</Badge>
                                  )}
                                  {!lesson.isPublished && (
                                    <Badge variant="secondary" className="text-xs bg-muted">Draft</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  {lesson.hasQuiz && (
                                    <span className="flex items-center gap-1">
                                      <HelpCircle className="h-3.5 w-3.5" />
                                      {quizLevelsWithContent}/3
                                    </span>
                                  )}
                                  <span>{formatDuration(lesson.duration)}</span>
                                  <Button
                                    variant="ghost" size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => navigate(
                                      `/creator/courses/${courseId}/sections/${section.id}/lessons/${lesson.id}`
                                    )}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="sm"
                                    className="h-7 w-7 p-0 text-destructive"
                                    onClick={() => handleDeleteLesson(section.id, lesson.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      <div className="px-4 py-3 border-t">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => setLessonDialog({ open: true, sectionId: section.id })}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add Lesson
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>

          {/* ── Settings ── */}
          <TabsContent value="settings">
            <CourseSettingsTab course={course} onUpdated={fetchCourse} />
          </TabsContent>
        </Tabs>
      </div>

      <SectionDialog
        open={sectionDialog.open}
        onClose={() => setSectionDialog({ open: false })}
        courseId={courseId!}
        onSaved={fetchCourse}
        existing={sectionDialog.existing}
      />

      <AddLessonDialog
        open={lessonDialog.open}
        onClose={() => setLessonDialog({ open: false, sectionId: "" })}
        courseId={courseId!}
        sectionId={lessonDialog.sectionId}
      />
    </DashboardLayout>
  );
}