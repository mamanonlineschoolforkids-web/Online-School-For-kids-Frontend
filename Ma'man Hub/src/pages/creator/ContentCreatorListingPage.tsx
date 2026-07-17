import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Star,
  BookOpen,
  Users,
  MapPin,
  Filter,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import {
  creatorService,
  GetContentCreatorsParams,
  ContentCreatorListItemDto,
} from "@/services/creatorService";
import { useDebounce } from "@/hooks/useDebounce";

const PAGE_SIZE = 12;

// Adjust to match the real set of expertise tags used across your creators
const EXPERTISE_OPTIONS = [
  { value: "all", label: "All Expertise" },
  { value: "Math", label: "Math" },
  { value: "Science", label: "Science" },
  { value: "Coding", label: "Coding" },
  { value: "Language Arts", label: "Language Arts" },
  { value: "Test Prep", label: "Test Prep" },
  { value: "Arts & Design", label: "Arts & Design" },
];

const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "students", label: "Most Students" },
  { value: "courses", label: "Most Courses" },
  { value: "newest", label: "Newest" },
];

function CreatorCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex gap-4">
          <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentCreatorCard({ creator }: { creator: ContentCreatorListItemDto }) {
  const navigate = useNavigate();

  const initials = creator.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <Avatar className="h-16 w-16 flex-shrink-0">
            <AvatarImage src={creator.profilePictureUrl || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-lg truncate">
                    {creator.fullName}
                  </h3>
                  {creator.isVerifiedCreator && (
                    <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                {creator.country && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {creator.country}
                  </p>
                )}
              </div>

              {creator.averageRating > 0 && (
                <div className="flex items-center gap-1 text-sm font-medium shrink-0">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {creator.averageRating.toFixed(1)}
                  {creator.reviewsCount > 0 && (
                    <span className="text-muted-foreground font-normal">
                      ({creator.reviewsCount})
                    </span>
                  )}
                </div>
              )}
            </div>

            {creator.bio && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {creator.bio}
              </p>
            )}

            {creator.expertiseTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {creator.expertiseTags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {creator.expertiseTags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{creator.expertiseTags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {creator.coursesCount > 0 && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {creator.coursesCount} Course
                    {creator.coursesCount !== 1 ? "s" : ""}
                  </span>
                )}
                {creator.studentsCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {creator.studentsCount} Students
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/profile/${creator.id}`)}
                >
                  View Profile
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(`/creators/${creator.id}/courses`)}
                >
                  View Courses
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContentCreatorListingPage() {
  const [search, setSearch] = useState("");
  const [expertiseTag, setExpertiseTag] = useState("all");
  const [sort, setSort] = useState("rating");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  const queryParams: GetContentCreatorsParams = {
    search: debouncedSearch || undefined,
    expertiseTag: expertiseTag !== "all" ? expertiseTag : undefined,
    sortBy: sort as GetContentCreatorsParams["sortBy"],
    sortOrder: "desc",
    page,
    pageSize: PAGE_SIZE,
  };

const { data, isLoading, isError } = useQuery({
  queryKey: ["content-creators", queryParams],
  queryFn: () => creatorService.getContentCreators(queryParams),
  placeholderData: (prev) => prev,
});

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handleExpertise = useCallback((val: string) => {
    setExpertiseTag(val);
    setPage(1);
  }, []);

  const handleSort = useCallback((val: string) => {
    setSort(val);
    setPage(1);
  }, []);

  const creators = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <MainLayout>
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Meet Our Content Creators
          </h1>
          <p className="text-muted-foreground">
            Browse instructors and explore the courses they've created
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, expertise..."
              className="pl-9"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <Select value={expertiseTag} onValueChange={handleExpertise}>
            <SelectTrigger className="w-full sm:w-52">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Expertise" />
            </SelectTrigger>
            <SelectContent>
              {EXPERTISE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={handleSort}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            {totalCount} creator{totalCount !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Cards */}
        {isError ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Failed to load content creators. Please try again.
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <CreatorCardSkeleton key={i} />
            ))}
          </div>
        ) : creators.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No content creators found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {creators.map((c) => (
              <ContentCreatorCard key={c.id} creator={c} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}