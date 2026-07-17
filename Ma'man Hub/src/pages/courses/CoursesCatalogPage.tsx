import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, SlidersHorizontal, Grid, List,
  Star, Clock, Users, Heart, ShoppingCart,
  ChevronLeft, ChevronRight, BookOpen,
  Check, X, Baby, Smile, GraduationCap, UserCheck, Layers,
  Code2, Palette, Music, FlaskConical, Calculator,
  Languages, Dumbbell, Drama, Globe2, Cpu, Brush,
  Atom, Leaf, Wrench, Camera, Clapperboard, Scissors,
  Piano, Guitar, Mic2, PersonStanding, PenLine,
  ChefHat, Apple, HeartPulse, Trophy, LandPlot,
  BrainCircuit, Banknote, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCartStore } from "@/stores/cartStore";
import {
  courseService, AgeGroup,
  AGE_GROUPS, getAgeGroupMeta,
} from "@/services/courseService";
import api from "@/services/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWishlistStore } from "@/stores/wishlistStore";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CategoryDto {
  id: string;
  name: string;
  imageUrl?: string;
  iconUrl?: string;
  displayOrder: number;
}
interface PagedCategoryResponse {
  items: CategoryDto[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}
interface ApiResponse<T> { data: T; success: boolean; }

interface CourseDto {
  id:                  string;
  title:               string;
  description:         string;
  instructorId:        string;
  instructorName:      string;
  instructorAvatarUrl?: string;
  categoryId:          string;
  categoryName:        string;
  ageGroup:            number;
  price:               number;
  discountPrice?:      number | null;
  rating:              number;
  totalStudents:       number;
  durationHours:       number;
  thumbnailUrl:        string;
  language:            string;
  lastUpdated?:        string;
  isInWishlist:        boolean;
  isInCart:            boolean;
}

// const LANGUAGES = ["English", "Arabic", "Spanish", "French", "German"];
const PAGE_SIZE = 12;
const CATEGORIES_INITIAL_COUNT = 3;

// ── Category icon map ─────────────────────────────────────────────────────────
const CATEGORY_ICON_MAP: [string, React.ElementType][] = [
  ["programming", Code2], ["coding", Code2], ["web dev", Code2], ["software", Code2],
  ["computer", Cpu], ["technology", Cpu], ["robotics", Cpu], ["tech", Cpu],
  ["mathematics", Calculator], ["math", Calculator], ["algebra", Calculator],
  ["physics", Atom], ["chemistry", FlaskConical], ["biology", Leaf], ["science", FlaskConical],
  ["engineering", Wrench], ["photography", Camera], ["film", Clapperboard], ["video", Clapperboard],
  ["drawing", Brush], ["painting", Brush], ["graphic", Palette], ["design", Palette], ["art", Palette],
  ["craft", Scissors], ["piano", Piano], ["guitar", Guitar], ["music", Music],
  ["singing", Mic2], ["dance", PersonStanding], ["theater", Drama], ["drama", Drama],
  ["reading", BookOpen], ["writing", PenLine], ["english", Languages], ["arabic", Languages],
  ["language", Languages], ["cooking", ChefHat], ["nutrition", Apple], ["health", HeartPulse],
  ["fitness", Dumbbell], ["sports", Trophy], ["history", LandPlot], ["geography", Globe2],
  ["social", Users], ["psychology", BrainCircuit], ["finance", Banknote], ["business", Briefcase],
];

function getCategoryIcon(name: string): React.ElementType {
  const key = name.toLowerCase();
  for (const [k, Icon] of CATEGORY_ICON_MAP) {
    if (key.includes(k)) return Icon;
  }
  return BookOpen;
}

function CategoryIcon({ cat, className }: { cat: CategoryDto; className?: string }) {
  const LucideIcon = getCategoryIcon(cat.name);
  if (cat.iconUrl) return <img src={cat.iconUrl} alt="" className={cn("object-contain shrink-0", className)} />;
  return <LucideIcon className={cn("shrink-0", className)} />;
}

// ── Age group helpers ─────────────────────────────────────────────────────────
const AGE_GROUP_FROM_INT: Record<number, AgeGroup> = {
  0: "ForParents", 1: "ForEducators", 2: "Toddlers", 3: "Preschool",
  4: "EarlyPrimary", 5: "LatePrimary", 6: "Tweens", 7: "Teenagers",
};
function resolveAgeGroup(value: AgeGroup | number): AgeGroup | null {
  if (typeof value === "number") return AGE_GROUP_FROM_INT[value] ?? null;
  const known: AgeGroup[] = ["ForParents","ForEducators","Toddlers","Preschool","EarlyPrimary","LatePrimary","Tweens","Teenagers"];
  return known.includes(value) ? value : null;
}

function AgeGroupIcon({ value, className }: { value: AgeGroup; className?: string }) {
  const cls = cn("shrink-0", className);
  switch (value) {
    case "Toddlers":     return <Baby          className={cls} />;
    case "Preschool":    return <Smile         className={cls} />;
    case "EarlyPrimary": return <BookOpen      className={cls} />;
    case "LatePrimary":  return <FlaskConical  className={cls} />;
    case "Tweens":       return <UserCheck     className={cls} />;
    case "Teenagers":    return <GraduationCap className={cls} />;
    case "ForParents":   return <Users         className={cls} />;
    case "ForEducators": return <Layers        className={cls} />;
    default:             return <BookOpen      className={cls} />;
  }
}

export function AgeGroupBadge({ value, size = "sm" }: {
  value: AgeGroup | number;
  size?: "sm" | "md";
}) {
  const resolved = resolveAgeGroup(value);
  const meta = resolved ? AGE_GROUPS.find(g => g.value === resolved) : null;
  if (!meta) return null;
  return (
    <span className={cn(
      "inline-flex items-center rounded-md font-semibold whitespace-nowrap tracking-wide uppercase",
      meta.color, meta.textColor,
      size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
    )}>
      {meta.label}
    </span>
  );
}

function CategoryBadge({ cat, size = "sm" }: { cat: CategoryDto; size?: "sm" | "md" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md font-semibold whitespace-nowrap tracking-wide uppercase bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
      size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
    )}>
      <CategoryIcon cat={cat} className="h-3 w-3 shrink-0" />
      {cat.name}
    </span>
  );
}

function InstructorChip({ course }: { course: CourseDto }) {
  return (
    <Link to={`/profile/${course.instructorId}`} onClick={e => e.stopPropagation()}
      className="flex items-center gap-2 group/inst w-fit max-w-full mt-1">
      <Avatar className="h-6 w-6 shrink-0 ring-2 ring-border group-hover/inst:ring-primary transition-all">
        {course.instructorAvatarUrl && <AvatarImage src={course.instructorAvatarUrl} alt={course.instructorName} />}
        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
          {course.instructorName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] text-muted-foreground leading-none mb-0.5">Instructor</span>
        <span className="text-xs font-semibold text-foreground group-hover/inst:text-primary transition-colors truncate leading-none">
          {course.instructorName}
        </span>
      </div>
    </Link>
  );
}

// ── Course Card ───────────────────────────────────────────────────────────────
function CourseCard({ course, isList, isFavorite, favoriteLoading, onToggleFavorite, onAddToCart, inCart }: {
  course: CourseDto; isList: boolean; isFavorite: boolean; favoriteLoading: boolean;
  onToggleFavorite: () => void; onAddToCart: () => void; inCart: boolean;
}) {
  const displayPrice = course.discountPrice ?? course.price;
  const hasDiscount  = course.discountPrice != null && course.discountPrice < course.price;

  return (
    <div className={cn(
      "group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200",
      isList && "flex",
    )}>
      <Link to={`/courses/${course.id}`} className={cn("block relative", isList ? "w-56 shrink-0" : "")}>
        <div className="relative aspect-video overflow-hidden bg-muted">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-muted-foreground opacity-30" />
            </div>
          )}
          {/* Favourite button */}
          <button
            onClick={e => { e.preventDefault(); if (!favoriteLoading) onToggleFavorite(); }}
            disabled={favoriteLoading}
            className={cn(
              "absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors",
              favoriteLoading && "opacity-60 cursor-not-allowed",
            )}
          >
            <Heart className={cn(
              "h-3.5 w-3.5 transition-colors",
              isFavorite ? "fill-red-400 text-red-400" : "text-white",
            )} />
          </button>
          <div className="absolute top-2.5 left-2.5">
            <AgeGroupBadge value={course.ageGroup} size="sm" />
          </div>
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1 min-w-0">
        {course.categoryName && course.categoryName.toLowerCase() !== "unknown" && (() => {
          const fakeCat: CategoryDto = { id: course.categoryId, name: course.categoryName, displayOrder: 0 };
          return (
            <div className="mb-2">
              <CategoryBadge cat={fakeCat} size="sm" />
            </div>
          );
        })()}

        <Link to={`/courses/${course.id}`}>
          <h3 className="font-bold text-[15px] leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-1.5">
            {course.title}
          </h3>
        </Link>

        <InstructorChip course={course} />
        <div className="flex items-center gap-3 mt-2.5 text-sm">
          <span className="flex items-center gap-1 font-semibold text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{course.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Clock className="h-3 w-3" />{course.durationHours}h
          </span>
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Users className="h-3 w-3" />{course.totalStudents.toLocaleString()}
          </span>
          {course.language && (
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <Globe2 className="h-3 w-3" />{course.language}
            </span>
          )}
          {course.lastUpdated && (
            <span className="text-muted-foreground text-xs ml-auto">{course.lastUpdated}</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold">${displayPrice.toFixed(2)}</span>
            {hasDiscount && <span className="text-xs text-muted-foreground line-through">${course.price.toFixed(2)}</span>}
          </div>
          <Button size="sm" variant={inCart ? "secondary" : "default"} onClick={onAddToCart}
            disabled={inCart || course.isInCart} className="h-8 px-3 text-xs">
            {inCart || course.isInCart
              ? <><Check className="h-3.5 w-3.5 mr-1" />In Cart</>
              : <><ShoppingCart className="h-3.5 w-3.5 mr-1" />Add</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CoursesCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [viewMode,  setViewMode]  = useState<"grid" | "list">("grid");

  // favourites: set of courseIds currently in wishlist
  const [favorites,        setFavorites]        = useState<Set<string>>(new Set());
  // track which courseIds have an in-flight favourite request
  const [favoriteLoading,  setFavoriteLoading]  = useState<Set<string>>(new Set());

  const [searchQuery,        setSearchQuery]        = useState("");
  const [committedSearch,    setCommittedSearch]    = useState("");
  const [priceRange,         setPriceRange]         = useState([0, 200]);
  const [selectedAgeGroup,   setSelectedAgeGroup]   = useState<AgeGroup | "all">(() =>
    (searchParams.get("ageGroup") as AgeGroup) ?? "all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cat = searchParams.get("categoryId");
    return cat ? [cat] : [];
  });
  const [selectedLanguages,  setSelectedLanguages]  = useState<string[]>([]);
  const [minRating,          setMinRating]          = useState(0);
  const [sortBy,             setSortBy]             = useState("relevance");
  const [page,               setPage]               = useState(1);
  const [showAllCategories,  setShowAllCategories]  = useState(false);
  const [fetchTrigger,       setFetchTrigger]       = useState(0);

const [courses,    setCourses]    = useState<CourseDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [languages,  setLanguages]  = useState<string[]>([]);

  const { addItem, isInCart } = useCartStore();
  const wishlistIncrement = useWishlistStore((s) => s.increment);
  const wishlistDecrement = useWishlistStore((s) => s.decrement);

useEffect(() => {
    document.documentElement.style.scrollbarGutter = "stable";
    return () => { document.documentElement.style.scrollbarGutter = ""; };
  }, []);

  useEffect(() => {
    api.get<ApiResponse<PagedCategoryResponse | CategoryDto[]>>("/Category?page=1&pageSize=50")
      .then(r => {
        const payload = r.data.data;
        const list = Array.isArray(payload) ? payload : payload.items;
        setCategories([...list].sort((a, b) => a.displayOrder - b.displayOrder));
      })
      .catch(() => {});
  }, []);

    useEffect(() => {
    api.get<ApiResponse<{ languages: string[] }>>("/course/filters")
      .then((r) => setLanguages(r.data.data.languages ?? []))
      .catch(() => {});
  }, []);

  const fetchCourses = useCallback(async (
    search: string, pg: number, price: number[],
    ageGrp: AgeGroup | "all", cats: string[],
    langs: string[], rating: number, sort: string,
  ) => {
    setIsLoading(true); setError(null);
    try {
      let backendSortBy = "relevance", sortOrder = "desc";
      if (sort === "rating")     { backendSortBy = "rating"; }
      if (sort === "newest")     { backendSortBy = "date"; }
      if (sort === "price-low")  { backendSortBy = "price"; sortOrder = "asc"; }
      if (sort === "price-high") { backendSortBy = "price"; sortOrder = "desc"; }

      const result = await courseService.getCourses({
        searchQuery: search || undefined,
        minPrice:    price[0] > 0   ? price[0]  : undefined,
        maxPrice:    price[1] < 200 ? price[1]  : undefined,
        ageGroup:    ageGrp !== "all" ? ageGrp as AgeGroup : undefined,
        categoryId:  cats.length === 1 ? cats[0] : undefined,
        language:    langs.length === 1 ? langs[0] : undefined,
        minRating:   rating > 0 ? rating : undefined,
        sortBy: backendSortBy, sortOrder, page: pg, pageSize: PAGE_SIZE,
      });
      setCourses(result.items);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);

      // Seed the favourites set from the API response
      setFavorites(new Set(
        result.items.filter((c: CourseDto) => c.isInWishlist).map((c: CourseDto) => c.id)
      ));
    } catch {
      setError("Failed to load courses. Please try again.");
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setPage(1);
  }, [priceRange, selectedAgeGroup, selectedCategories, selectedLanguages, minRating, sortBy]); // eslint-disable-line

  useEffect(() => {
    fetchCourses(committedSearch, page, priceRange, selectedAgeGroup, selectedCategories, selectedLanguages, minRating, sortBy);
  }, [committedSearch, page, priceRange, selectedAgeGroup, selectedCategories, selectedLanguages, minRating, sortBy, fetchTrigger, fetchCourses]); // eslint-disable-line

  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedCategories.length === 1) params.categoryId = selectedCategories[0];
    if (selectedAgeGroup !== "all") params.ageGroup = selectedAgeGroup;
    setSearchParams(params, { replace: true });
  }, [selectedCategories, selectedAgeGroup, setSearchParams]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { setPage(1); setCommittedSearch(searchQuery.trim()); setFetchTrigger(n => n + 1); }
  };
  const submitSearch = () => { setPage(1); setCommittedSearch(searchQuery.trim()); setFetchTrigger(n => n + 1); };
  const clearSearch  = () => { setSearchQuery(""); setCommittedSearch(""); setPage(1); setFetchTrigger(n => n + 1); };

  // ── Favourite toggle ────────────────────────────────────────────────────────
  const handleToggleFavorite = async (courseId: string) => {
    const isCurrentlyFav = favorites.has(courseId);

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      isCurrentlyFav ? next.delete(courseId) : next.add(courseId);
      return next;
    });
    setFavoriteLoading(prev => new Set(prev).add(courseId));

    try {
      if (isCurrentlyFav) {
        await api.delete(`/Course/favourite/${courseId}`);
        wishlistDecrement();
        toast({ title: "Removed from wishlist" });
      } else {
        await api.post("/Course/favourite", { courseId });
        wishlistIncrement();
        toast({ title: "Added to wishlist", description: "Saved to your favourites" });
      }
    } catch {
      // Rollback on failure
      setFavorites(prev => {
        const next = new Set(prev);
        isCurrentlyFav ? next.add(courseId) : next.delete(courseId);
        return next;
      });
      // Rollback store count too
      isCurrentlyFav ? wishlistIncrement() : wishlistDecrement();
      toast({
        title: "Something went wrong",
        description: "Could not update your wishlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setFavoriteLoading(prev => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
    }
  };

  const handleAddToCart = (course: CourseDto) => {
    const hasDiscount = course.discountPrice != null && course.discountPrice < course.price;
    addItem({
      id:            course.id,
      title:         course.title,
      instructor:    course.instructorName,
      price:         hasDiscount ? course.discountPrice! : course.price,
      originalPrice: course.price,
      thumbnail:     course.thumbnailUrl ?? "",
      level:         AGE_GROUP_FROM_INT[course.ageGroup] ?? "",
    });
  };

  const toggleCategory = (id: string) =>
    setSelectedCategories(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const activeFiltersCount =
    (selectedAgeGroup !== "all" ? 1 : 0) +
    selectedCategories.length + selectedLanguages.length +
    (minRating > 0 ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 200 ? 1 : 0);

  const clearFilters = () => {
    setSelectedAgeGroup("all"); setSelectedCategories([]); setSelectedLanguages([]);
    setPriceRange([0, 200]); setMinRating(0); setSearchQuery(""); setCommittedSearch("");
    setPage(1); setFetchTrigger(n => n + 1);
  };

  const visibleCategories = showAllCategories ? categories : categories.slice(0, CATEGORIES_INITIAL_COUNT);

  const FilterSidebar = () => (
    <div className="space-y-7 pr-4">
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Price</h3>
        <div className="px-1">
          <Slider value={priceRange} onValueChange={setPriceRange} max={200} step={5} className="w-full" />
        </div>
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>${priceRange[0]}</span>
          <span>{priceRange[1] >= 200 ? "Any price" : `$${priceRange[1]}`}</span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Min Rating</h3>
        <div className="space-y-0.5">
          {[4.5, 4.0, 3.5, 3.0].map(r => (
            <button key={r} onClick={() => setMinRating(p => p === r ? 0 : r)}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm transition-colors",
                minRating === r ? "bg-amber-50 text-amber-700 font-medium" : "hover:bg-muted",
              )}>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={cn("h-3 w-3",
                    i < Math.floor(r) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted")} />
                ))}
              </div>
              <span className="text-xs">{r}+</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Language</h3>
        <div className="space-y-1.5">
           {languages.map(lang => (
            <div key={lang} className="flex items-center space-x-2 px-2">
              <Checkbox id={`lang-${lang}`} checked={selectedLanguages.includes(lang)}
                onCheckedChange={c => setSelectedLanguages(p => c ? [...p, lang] : p.filter(l => l !== lang))} />
              <Label htmlFor={`lang-${lang}`} className="text-sm font-normal cursor-pointer">{lang}</Label>
            </div>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Category</h3>
          <div className="space-y-1">
            {visibleCategories.map(cat => {
              const selected = selectedCategories.includes(cat.id);
              return (
                <button key={cat.id} onClick={() => toggleCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all w-full",
                    selected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 hover:bg-muted text-foreground border border-transparent hover:border-border/60",
                  )}>
                  <CategoryIcon cat={cat} className={cn("h-4 w-4 shrink-0", selected ? "opacity-90" : "opacity-60")} />
                  <span className="flex-1 truncate">{cat.name}</span>
                  {selected && <X className="h-3.5 w-3.5 opacity-80 shrink-0" />}
                </button>
              );
            })}
          </div>
          {categories.length > CATEGORIES_INITIAL_COUNT && (
            <button onClick={() => setShowAllCategories(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors w-full">
              {showAllCategories
                ? <><ChevronLeft className="h-3.5 w-3.5 rotate-90" />Show less</>
                : <><ChevronRight className="h-3.5 w-3.5 rotate-90" />Show {categories.length - CATEGORIES_INITIAL_COUNT} more</>}
            </button>
          )}
        </div>
      )}

      {activeFiltersCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full text-sm">
          Clear {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""}
        </Button>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="container py-8 max-w-screen-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold mb-1">Explore Courses</h1>
          <p className="text-muted-foreground">
            {totalCount > 0 ? `${totalCount.toLocaleString()} courses available` : "Discover courses for every age and stage"}
          </p>
        </div>

        {(selectedAgeGroup !== "all" || selectedCategories.length > 0 || committedSearch) && (
          <div className="flex flex-wrap gap-2 mb-5">
            {committedSearch && (
              <button onClick={clearSearch}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm bg-muted text-foreground font-medium hover:opacity-80 transition-opacity border">
                <Search className="h-3 w-3 opacity-60" />"{committedSearch}"
                <X className="h-3 w-3 opacity-50 ml-0.5" />
              </button>
            )}
            {selectedAgeGroup !== "all" && (() => {
              const resolved = resolveAgeGroup(selectedAgeGroup as AgeGroup);
              const meta = resolved ? getAgeGroupMeta(resolved) : null;
              if (!meta) return null;
              return (
                <button onClick={() => setSelectedAgeGroup("all")}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold hover:opacity-70 transition-opacity", meta.color, meta.textColor, meta.borderColor)}>
                  <AgeGroupIcon value={resolved!} className="h-3.5 w-3.5" />
                  {meta.label}<span className="opacity-60 text-xs">· {meta.ageRange}</span>
                  <X className="h-3 w-3 opacity-50 ml-0.5" />
                </button>
              );
            })()}
            {selectedCategories.map(cid => {
              const cat = categories.find(c => c.id === cid);
              if (!cat) return null;
              return (
                <button key={cid} onClick={() => toggleCategory(cid)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm bg-primary text-primary-foreground font-medium hover:opacity-80 transition-opacity">
                  <CategoryIcon cat={cat} className="h-3.5 w-3.5" />{cat.name}
                  <X className="h-3 w-3 opacity-60 ml-0.5" />
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search courses…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown}
              className="pl-10 pr-20 h-11 text-sm" />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button onClick={clearSearch} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                  <X className="h-4 w-4" />
                </button>
              )}
              <button onClick={submitSearch}
                className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden relative">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />Filters
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center min-w-[18px] px-1">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto">
                <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                <div className="mt-4"><FilterSidebar /></div>
              </SheetContent>
            </Sheet>

            <Select value={selectedAgeGroup} onValueChange={v => setSelectedAgeGroup(v as AgeGroup | "all")}>
              <SelectTrigger className="w-44 h-11 text-sm"><SelectValue placeholder="All ages" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ages</SelectItem>
                {AGE_GROUPS.map(group => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}<span className="text-muted-foreground text-xs ml-1">· {group.ageRange}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 h-11 text-sm"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Most Relevant</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low → High</SelectItem>
                <SelectItem value="price-high">Price: High → Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="hidden sm:flex items-center border rounded-lg p-1 gap-0.5">
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}>
                <Grid className="h-3.5 w-3.5" />
              </Button>
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}>
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0 sticky top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pb-8">
            <FilterSidebar />
          </aside>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-5">
              {isLoading ? "Loading…" : `${courses.length} of ${totalCount} courses`}
            </p>

            {error && (
              <div className="text-center py-16">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => setFetchTrigger(n => n + 1)}>Try Again</Button>
              </div>
            )}

            {isLoading && (
              <div className={cn("gap-5", viewMode === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3" : "space-y-4")}>
                {[...Array(PAGE_SIZE)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !error && courses.length === 0 && (
              <div className="text-center py-20">
                <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="h-9 w-9 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">No courses found</h3>
                <p className="text-muted-foreground mb-4">Try different filters or search terms</p>
                <Button onClick={clearFilters}>Clear all filters</Button>
              </div>
            )}

            {!isLoading && !error && courses.length > 0 && (
              <motion.div layout className={cn("gap-5", viewMode === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3" : "space-y-4")}>
                {courses.map((course, i) => (
                  <motion.div key={course.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <CourseCard
                      course={course}
                      isList={viewMode === "list"}
                      isFavorite={favorites.has(course.id)}
                      favoriteLoading={favoriteLoading.has(course.id)}
                      onToggleFavorite={() => handleToggleFavorite(course.id)}
                      onAddToCart={() => handleAddToCart(course)}
                      inCart={isInCart(course.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Prev
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const n = start + i;
                  if (n > totalPages) return null;
                  return (
                    <Button key={n} variant={n === page ? "default" : "outline"} size="sm" className="w-9" onClick={() => setPage(n)}>
                      {n}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}