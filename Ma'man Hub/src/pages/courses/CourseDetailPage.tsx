import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Star, Users, Clock, Globe, BookOpen, Play, ShoppingCart,
  Heart, ChevronDown, ChevronUp, CheckCircle2, Lock, Loader2,
  AlertCircle, Award, BarChart2, MessageSquare, ThumbsUp,
  PlayCircle, FileText, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "../../stores/authStore.ts";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { studentService, CourseRecommendation } from "@/services/studentService";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  isFree: boolean;
  order: number;
}

interface CourseModule {
  id: string;
  title: string;
  duration: string;
  lessonsCount: number;
  order: number;
  lessons: CourseLesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  instructorId: string;
  instructorName: string;
  instructorAvatarUrl?: string;
  instructorBio: string;
  instructorRating: number;
  instructorReviewsCount: number;
  instructorStudentsCount: number;
  instructorCoursesCount: number;
  categoryId: string;
  categoryName: string;
  ageGroup: string;
  levelDisplay: string;
  price: number;
  discountPrice?: number;
  rating: number;
  totalStudents: number;
  durationHours: number;
  lecturesCount: number;
  thumbnailUrl: string;
  previewVideoUrl?: string;
  language: string;
  isFeatured: boolean;
  isInWishlist: boolean;
  isInCart: boolean;
  lastUpdated: string;
  whatYoullLearn: string[];
  requirements: string[];
  modules: CourseModule[];
  relatedCourses: {
    id: string;
    title: string;
    instructor: string;
    thumbnail: string;
    rating: number;
    price: number;
  }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(h: number) {
  if (!h || h === 0) return null;
  return h >= 1 ? `${h}h total` : `${Math.round(h * 60)}m total`;
}

function totalLessonsCount(modules: CourseModule[]) {
  return modules.reduce((sum, m) => sum + m.lessonsCount, 0);
}

// ── Sub-component: course card (used for related + recommendations) ────────────

function CourseCard({
  id, title, instructor, thumbnail, rating, price,
}: {
  id: string; title: string; instructor: string;
  thumbnail: string; rating: number; price: number;
}) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/courses/${id}`)}
      className="group cursor-pointer rounded-xl border overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-video bg-muted overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-muted-foreground">{instructor}</p>
        <div className="flex items-center gap-1.5 text-xs">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-medium">{rating?.toFixed(1)}</span>
        </div>
        <p className="font-bold text-sm">${price?.toFixed(2)}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, token } = useAuthStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived from API response — no separate state store needed
  const [isInCart, setIsInCart] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [previewLesson, setPreviewLesson] = useState<{ id: string; title: string } | null>(null);

  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [showAllObjectives, setShowAllObjectives] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    api
      .get(`/course/${courseId}`, { params: { userId: user?.id } })
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setCourse(data);
        // Initialize button state from API response — single source of truth
        setIsInCart(data.isInCart ?? false);
        setIsInWishlist(data.isInWishlist ?? false);
        if (data.modules?.length > 0) {
          setExpandedSections([data.modules[0].id]);
        }
      })
      .catch(() => setError("Could not load this course."))
      .finally(() => setLoading(false));
  }, [courseId, user?.id]);

  useEffect(() => {
    if (!courseId) return;
    studentService
      .getRecommendations(courseId, 5)
      .then(setRecommendations)
      .catch(() => {}); // silent — recommendations are non-critical
  }, [courseId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAddToCart = async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (isInCart) {
      navigate("/cart");
      return;
    }
    setCartLoading(true);
    try {
      await studentService.addToCart(courseId!);
      setIsInCart(true);
      toast({ title: "Added to cart" });
      navigate("/cart");
    } catch (err: any) {
      toast({
        title: "Failed to add to cart",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setCartLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    setCartLoading(true);
    try {
      if (!isInCart) {
        await studentService.addToCart(courseId!);
        setIsInCart(true);
      }
      navigate("/cart");
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setCartLoading(false);
    }
  };

  const handleWishlist = async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    setWishlistLoading(true);
    try {
      const result = await studentService.toggleWishlist(courseId!);
      setIsInWishlist(result.isInWishlist);
      toast({ title: result.isInWishlist ? "Added to wishlist" : "Removed from wishlist" });
    } catch {
      toast({ title: "Failed to update wishlist", variant: "destructive" });
    } finally {
      setWishlistLoading(false);
    }
  };

  const handlePreviewLesson = (lesson: CourseLesson) => {
    // Navigate to a read-only version of the player
    navigate(`/course/${courseId}/learn?lessonId=${lesson.id}&preview=true`);
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p>Loading course…</p>
    </div>
  );

  if (error || !course) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-muted-foreground">{error ?? "Course not found."}</p>
      <Button variant="outline" onClick={() => navigate("/courses")}>Browse Courses</Button>
    </div>
  );

  const durationText = formatDuration(course.durationHours);
  const objectives = showAllObjectives
    ? course.whatYoullLearn
    : course.whatYoullLearn.slice(0, 6);
  const displayPrice = course.discountPrice ?? course.price;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            {course.subtitle && (
              <p className="text-primary-foreground/70 text-sm">{course.subtitle}</p>
            )}
            <h1 className="text-2xl lg:text-3xl font-bold leading-tight">{course.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              {course.isFeatured && (
                <Badge className="bg-amber-500 text-white">⭐ Bestseller</Badge>
              )}
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <strong>{course.rating.toFixed(1)}</strong>
                <span className="text-white/60">({course.totalStudents?.toLocaleString()} students)</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
              {durationText && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {durationText}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <PlayCircle className="h-4 w-4" /> {totalLessonsCount(course.modules)} lectures
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" /> {course.language}
              </span>
              {course.lastUpdated && (
                <span className="text-white/60">Updated {course.lastUpdated}</span>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Avatar className="h-9 w-9 border-2 border-white/20">
                <AvatarImage src={course.instructorAvatarUrl} />
                <AvatarFallback>{course.instructorName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-white/60">Instructor</p>
                <p className="text-sm font-medium">{course.instructorName}</p>
              </div>
            </div>
          </div>

          {/* ── Sticky purchase card ── */}
          <div className="bg-white text-foreground rounded-2xl shadow-2xl overflow-hidden">
            {course.previewVideoUrl ? (
              <div className="relative aspect-video bg-black">
                <video
                  src={course.previewVideoUrl}
                  className="w-full h-full object-cover"
                  controls
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
                    <Play className="h-5 w-5 text-slate-900 ml-0.5" />
                  </div>
                </div>
              </div>
            ) : course.thumbnailUrl ? (
              <div className="aspect-video overflow-hidden">
                <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-primary/40" />
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">${displayPrice.toFixed(2)}</span>
                {course.discountPrice && (
                  <span className="text-muted-foreground line-through text-sm">${course.price.toFixed(2)}</span>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                >
                  {cartLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                  {isInCart ? "Go to Cart" : "Add to Cart"}
                </Button>
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={handleBuyNow}
                  disabled={cartLoading}
                >
                  Buy Now
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleWishlist}
                  disabled={wishlistLoading}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isInWishlist ? "fill-red-500 text-red-500" : ""}`} />
                  {isInWishlist ? "Saved to Wishlist" : "Save to Wishlist"}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                {durationText && <p className="flex gap-2"><Clock className="h-3.5 w-3.5 shrink-0" />{durationText}</p>}
                <p className="flex gap-2"><PlayCircle className="h-3.5 w-3.5 shrink-0" />{totalLessonsCount(course.modules)} lectures</p>
                <p className="flex gap-2"><Globe className="h-3.5 w-3.5 shrink-0" />{course.language}</p>
                <p className="flex gap-2"><Award className="h-3.5 w-3.5 shrink-0" />Certificate of completion</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          {/* What you'll learn */}
          {course.whatYoullLearn.length > 0 && (
            <section className="border rounded-xl p-5">
              <h2 className="text-lg font-bold mb-3">What you'll learn</h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {objectives.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {course.whatYoullLearn.length > 6 && (
                <button
                  onClick={() => setShowAllObjectives(!showAllObjectives)}
                  className="mt-3 text-sm text-primary font-medium flex items-center gap-1"
                >
                  {showAllObjectives ? "Show less" : `Show ${course.whatYoullLearn.length - 6} more`}
                  {showAllObjectives ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}
            </section>
          )}

          {/* Description */}
          <section>
            <h2 className="text-lg font-bold mb-2">About this course</h2>
            <div className={`text-sm text-muted-foreground leading-relaxed ${!showFullDesc ? "line-clamp-4" : ""}`}>
              {course.description}
            </div>
            {course.description?.length > 300 && (
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="mt-2 text-sm text-primary font-medium flex items-center gap-1"
              >
                {showFullDesc ? "Show less" : "Show more"}
                {showFullDesc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </section>

          {/* Requirements */}
          {course.requirements.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-2">Requirements</h2>
              <ul className="space-y-1.5">
                {course.requirements.map((req, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Course content */}
          <section>
            <h2 className="text-lg font-bold mb-1">Course Content</h2>
            <p className="text-sm text-muted-foreground mb-3">
              {course.modules.length} sections • {totalLessonsCount(course.modules)} lectures
              {durationText && ` • ${durationText}`}
            </p>

            <Accordion type="multiple" value={expandedSections}
              onValueChange={setExpandedSections} className="border rounded-xl overflow-hidden">
              {course.modules.map((module) => (
                <AccordionItem key={module.id} value={module.id}>
                  <AccordionTrigger className="px-4 hover:no-underline bg-muted/30">
                    <div className="flex items-center justify-between w-full pr-3 text-left">
                      <span className="font-medium text-sm">{module.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-3">
                        {module.lessonsCount} lessons · {module.duration}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 py-0">
                    <ul className="divide-y">
                      {module.lessons.map((lesson) => (
                        <li key={lesson.id}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {lesson.isFree ? (
                              <button
                                onClick={() => handlePreviewLesson(lesson)}
                                className="flex items-center gap-2.5 text-left min-w-0 group"
                              >
                                <Play className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="text-sm truncate group-hover:text-primary transition-colors">
                                  {lesson.title}
                                </span>
                                <Badge variant="outline" className="text-xs shrink-0 text-primary border-primary">
                                  Preview
                                </Badge>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-sm text-muted-foreground truncate">{lesson.title}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 ml-3">
                            {lesson.duration}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Instructor */}
          <section className="border rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-bold">Your Instructor</h2>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarImage src={course.instructorAvatarUrl} />
                <AvatarFallback className="text-lg">{course.instructorName[0]}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="font-semibold text-base">{course.instructorName}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {course.instructorRating?.toFixed(1)} Instructor Rating
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {course.instructorReviewsCount?.toLocaleString()} Reviews
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {course.instructorStudentsCount?.toLocaleString()} Students
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course.instructorCoursesCount} Courses
                  </span>
                </div>
              </div>
            </div>
            {course.instructorBio && (
              <p className="text-sm text-muted-foreground leading-relaxed">{course.instructorBio}</p>
            )}
          </section>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3">You Might Also Like</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec) => (
                  <CourseCard
                    key={rec.id}
                    id={rec.id}
                    title={rec.title}
                    instructor={rec.instructorName}
                    thumbnail={rec.thumbnailUrl}
                    rating={rec.rating}
                    price={rec.discountPrice ?? rec.price}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Related courses from backend */}
          {course.relatedCourses?.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3">Related Courses</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {course.relatedCourses.map((rc) => (
                  <CourseCard
                    key={rc.id}
                    id={rc.id}
                    title={rc.title}
                    instructor={rc.instructor}
                    thumbnail={rc.thumbnail}
                    rating={rc.rating}
                    price={rc.price}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar spacer (the card is in the hero on desktop) */}
        <div className="hidden lg:block" />
      </div>
    </div>
  );
}
