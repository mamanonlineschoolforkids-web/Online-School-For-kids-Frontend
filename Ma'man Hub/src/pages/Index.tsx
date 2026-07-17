import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  ArrowRight,
  Star,
  Play,
  MessageCircle,
  Heart,
  Sparkles,
  UsersRound,
  Quote,
  PenLine,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MainLayout } from "@/components/layout/MainLayout";

import { courseService, type CourseDto } from "@/services/courseService";
import { feedApi, type Post } from "@/services/feedService";
import { specialistService, type SpecialistListItemDto } from "@/services/specialistService";
import { creatorService, type ContentCreatorListItemDto } from "@/services/creatorService";
import { reviewService, type ReviewDto } from "@/services/reviewService";
import { useAuthStore } from "@/stores/authStore";

// Stat bar — one line, serif numerals doing the talking instead of three icon cards
const stats = [
  { value: "500+", label: "Courses, toddlers to teens" },
  { value: "50K+", label: "Families learning together" },
  { value: "120+", label: "Certified specialists" },
];

// One card per feature of the app, so the homepage doubles as a map of what's here
const exploreHub = [
  {
    icon: BookOpen,
    title: "Courses",
    description: "Structured learning paths for every age group, from toddlers to teens.",
    to: "/courses",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: MessageCircle,
    title: "Feed",
    description: "Real stories, tips, and wins shared by parents and educators.",
    to: "/feed",
    color: "from-rose-500 to-orange-400",
  },
  {
    icon: GraduationCap,
    title: "Specialists",
    description: "Book 1:1 time with vetted child-development professionals.",
    to: "/specialists",
    color: "from-violet-500 to-purple-400",
  },
  {
    icon: Sparkles,
    title: "Creators",
    description: "Meet the educators building the courses your family loves.",
    to: "/creators",
    color: "from-amber-500 to-yellow-400",
  },
  {
    icon: UsersRound,
    title: "Communities",
    description: "Local and topic-based groups to connect with other families.",
    to: "/communities",
    color: "from-emerald-500 to-teal-400",
    comingSoon: true,
  },
];

function SectionHeader({
  eyebrow,
  title,
  linkTo,
  linkLabel = "View all",
}: {
  eyebrow: string;
  title: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
      <div>
        <p className="text-xs font-semibold text-accent uppercase tracking-[0.2em] mb-2">
          {eyebrow}
        </p>
        <h2 className="text-3xl lg:text-4xl font-bold font-display">{title}</h2>
      </div>
      {linkTo && (
        <Link to={linkTo}>
          <Button variant="ghost">
            {linkLabel} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}

function SkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

// The signature element: a hand-drawn growth path threading through the Explore Hub.
// It's not a numbered sequence — it's a visual echo of the "grow into" idea from the headline.
function GrowthPath() {
  return (
    <svg
      className="pointer-events-none absolute left-0 top-24 hidden lg:block w-full h-40"
      viewBox="0 0 1200 160"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <motion.path
        d="M20,80 C 220,10 320,150 480,80 S 780,10 940,80 1080,150 1180,60"
        className="stroke-accent"
        strokeWidth="2"
        strokeDasharray="1 10"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 0.5 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function Index() {
  const navigate = useNavigate();

  const { user, token } = useAuthStore();
  const isAuthenticated = !!token;

  const [courses, setCourses] = useState<CourseDto[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [specialists, setSpecialists] = useState<SpecialistListItemDto[] | null>(null);
  const [creators, setCreators] = useState<ContentCreatorListItemDto[] | null>(null);
  const [reviews, setReviews] = useState<ReviewDto[] | null>(null);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Subtle parallax on the hero video as the page scrolls
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

  useEffect(() => {
    courseService
      .getCourses({ sortBy: "rating", sortOrder: "desc", pageSize: 3 })
      .then((res) => setCourses(res.items))
      .catch(() => setCourses([]));

    feedApi
      .getFeed(1, 6)
      .then((res) => setPosts(res.publicPosts.slice(0, 3)))
      .catch(() => setPosts([]));

    specialistService
      .getSpecialists({ sortBy: "rating", sortOrder: "desc", pageSize: 3 })
      .then((res) => setSpecialists(res.items))
      .catch(() => setSpecialists([]));

    creatorService
      .getContentCreators({ sortBy: "rating", sortOrder: "desc", pageSize: 3 })
      .then((res) => setCreators(res.items))
      .catch(() => setCreators([]));

    reviewService
      .getReviews(1, 6)
      .then((res) => setReviews(res.items))
      .catch(() => setReviews([]));
  }, []);

  async function handleSubmitReview() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!reviewComment.trim()) {
      setReviewError("Tell us a bit about your experience first.");
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const created = await reviewService.createReview({
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviews((prev) => [created, ...(prev ?? [])]);
      setShowReviewForm(false);
      setReviewComment("");
      setReviewRating(5);
    } catch {
      setReviewError("Couldn't post your review right now. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <MainLayout>
      {/* Hero — video background, parallax scrim, headline with an accent phrase */}
      <section
        ref={heroRef}
        className="relative py-28 lg:py-40 text-primary-foreground overflow-hidden bg-primary"
      >
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0">
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            {/* Replace with your actual hero clip — kids/families in a learning moment works best */}
            <source src="/video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/35" />
        </motion.div>

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.25em] text-warning mb-5">
              For families, from toddlers to teens
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold font-display leading-[1.1] mb-6">
              Learning your whole family can{" "}
              <span className="text-accent">grow into</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/95 mb-10 max-w-xl mx-auto">
              Courses for every age, specialists you can talk to, and a community
              of parents and educators cheering you on.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/courses">
                <Button size="lg" variant="secondary" className="h-14 px-8 text-lg">
                  Explore Courses <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-14 px-8 text-lg transition-colors hover:bg-primary-foreground/10 hover:text-white"
                >
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stat bar — one line, serif numerals, dividers instead of icon cards */}
      <section className="border-b bg-background">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="py-10 px-6 text-center  first:pl-0 last:pr-0"
              >
                <p className="font-display text-4xl lg:text-5xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore Hub — growth path threads behind the cards */}
      {/* <section className="relative py-16 lg:py-20 bg-background overflow-hidden">
        <div className="container relative">
          <SectionHeader eyebrow="Everything in one place" title="Explore the App" />
          <div className="relative">
            <GrowthPath />
            <div className="relative grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {exploreHub.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <Link to={item.to} className="block h-full group">
                    <div className="h-full rounded-2xl border bg-card p-6 shadow-card course-card-hover relative overflow-hidden">
                      {item.comingSoon && (
                        <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground px-2 py-1 rounded-full">
                          Coming soon
                        </span>
                      )}
                      <div
                        className={`h-11 w-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold mb-1.5 group-hover:text-accent transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section> */}

      {/* Popular Courses */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <SectionHeader eyebrow="Top rated" title="Popular Courses" linkTo="/courses" />
          {courses === null ? (
            <SkeletonRow />
          ) : courses.length === 0 ? (
            <p className="text-muted-foreground">Check back soon for new courses.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link to={`/courses/${course.id}`} className="block group">
                    <div className="bg-card rounded-xl border overflow-hidden shadow-card course-card-hover">
                      <div className="relative aspect-video">
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="h-12 w-12 text-white" />
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold group-hover:text-accent transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {course.instructorName}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-warning text-warning" />
                            <span className="font-medium text-sm">{course.rating}</span>
                          </div>
                          <span className="font-bold">
                            ${course.discountPrice ?? course.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Community Feed preview */}
      <section className="py-16">
        <div className="container">
          <SectionHeader eyebrow="From the community" title="What Users Are Sharing" linkTo="/feed" />
          {posts === null ? (
            <SkeletonRow />
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground">No posts yet — be the first to share something.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-xl border p-5 shadow-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={post.author?.avatarUrl ?? "/default-avatar.png"}
                      alt={post.author?.fullName ?? "Member"}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-sm">
                        {post.author?.fullName ?? "Community member"}
                      </p>
                      <p className="text-xs text-muted-foreground">{post.author?.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 line-clamp-4 mb-4">{post.content}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4" /> {post.totalReactions}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" /> {post.commentsCount}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Specialists */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <SectionHeader
            eyebrow="Real people, real help"
            title="Meet Our Specialists"
            linkTo="/specialists"
          />
          {specialists === null ? (
            <SkeletonRow />
          ) : specialists.length === 0 ? (
            <p className="text-muted-foreground">Specialists are joining soon.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {specialists.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link to={`/specialists/${s.id}`} className="block group">
                    <div className="bg-card rounded-xl border p-5 shadow-card course-card-hover text-center">
                      <img
                        src={s.profilePictureUrl ?? "/default-avatar.png"}
                        alt={s.fullName}
                        className="h-20 w-20 rounded-full object-cover mx-auto mb-3"
                      />
                      <h3 className="font-semibold group-hover:text-accent transition-colors">
                        {s.fullName}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {s.professionalTitle}
                      </p>
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="font-medium">{s.rating}</span>
                        <span className="text-muted-foreground">
                          ({s.reviewsCount})
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Creators */}
      <section className="py-16">
        <div className="container">
          <SectionHeader eyebrow="Behind the courses" title="Top Creators" linkTo="/creators" />
          {creators === null ? (
            <SkeletonRow />
          ) : creators.length === 0 ? (
            <p className="text-muted-foreground">Creators are joining soon.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {creators.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link to={`/creators/${c.id}`} className="block group">
                    <div className="bg-card rounded-xl border p-5 shadow-card course-card-hover text-center">
                      <img
                        src={c.profilePictureUrl ?? "/default-avatar.png"}
                        alt={c.fullName}
                        className="h-20 w-20 rounded-full object-cover mx-auto mb-3"
                      />
                      <h3 className="font-semibold group-hover:text-accent transition-colors flex items-center justify-center gap-1">
                        {c.fullName}
                        {c.isVerifiedCreator && (
                          <Award className="h-4 w-4 text-accent" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                        {c.expertiseTags.join(" · ") || "Educator"}
                      </p>
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="font-medium">{c.averageRating}</span>
                        <span className="text-muted-foreground">
                          · {c.coursesCount} courses
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reviews */}
      <section className="py-16 lg:py-20 bg-muted/30">
        <div className="container">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-accent uppercase tracking-wide mb-1">
                What families say
              </p>
              <h2 className="text-3xl font-bold font-display">Reviews From Our Community</h2>
            </div>
            <Button onClick={() => setShowReviewForm(true)} className="gap-2">
              <PenLine className="h-4 w-4" /> Leave a Review
            </Button>
          </div>

          {reviews === null ? (
            <SkeletonRow />
          ) : reviews.length === 0 ? (
            <p className="text-muted-foreground">
              No reviews yet — be the first to share your experience.
            </p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {reviews.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card rounded-xl border p-6 shadow-card relative"
                >
                  <Quote className="h-6 w-6 text-accent/30 mb-2" />
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`h-4 w-4 ${
                          idx < r.rating
                            ? "fill-warning text-warning"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/90 mb-4 line-clamp-5">{r.comment}</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={r.userAvatarUrl ?? "/default-avatar.png"}
                      alt={r.userName}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <p className="font-medium text-sm">{r.userName}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Leave a review modal */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowReviewForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card rounded-2xl border shadow-xl w-full max-w-md p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowReviewForm(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold font-display mb-1">Leave a Review</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tell other families what your experience has been like.
              </p>

              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const value = idx + 1;
                  const active = value <= (reviewHover || reviewRating);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onMouseEnter={() => setReviewHover(value)}
                      onMouseLeave={() => setReviewHover(0)}
                      onClick={() => setReviewRating(value)}
                      aria-label={`${value} star`}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          active
                            ? "fill-warning text-warning"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share what you or your family enjoyed..."
                rows={4}
                className="mb-3"
              />

              {reviewError && (
                <p className="text-sm text-destructive mb-3">{reviewError}</p>
              )}

              <Button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="w-full"
              >
                {submittingReview ? "Posting..." : "Post Review"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-primary to-accent">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold font-display mb-4 text-white">
              Ready to Start Learning Together?
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of families already learning, sharing, and growing on the platform.
            </p>
            <Link to="/register">
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Get Started Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
}