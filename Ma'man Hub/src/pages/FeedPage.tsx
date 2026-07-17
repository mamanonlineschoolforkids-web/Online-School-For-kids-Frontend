import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Share2, Image, Video, Send, MoreHorizontal,
  Trash2, X, Facebook, Linkedin, Copy, Check, MessageSquare,
  Smile, Globe, Lock, Users, UserPlus, Flag, Loader2,
} from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { moderationService, type ReportReason } from "@/services/moderationService";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  feedApi, shareToSocial,
  type Post, type PostComment, type ReactionType,
  type SocialPlatform, type Visibility,
} from "../services/feedService.ts";
import { FollowButton } from "../components/ui/FollowButton";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  student:         "bg-info/10 text-info border-info/20",
  content_creator: "bg-accent/10 text-accent border-accent/20",
  specialist:      "bg-warning/10 text-warning border-warning/20",
  parent:          "bg-success/10 text-success border-success/20",
  admin:           "bg-destructive/10 text-destructive border-destructive/20",
};

const REACTIONS: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: "like",  emoji: "👍", label: "Like",  color: "text-blue-500" },
  { type: "love",  emoji: "❤️", label: "Love",  color: "text-red-500" },
  { type: "haha",  emoji: "😂", label: "Haha",  color: "text-yellow-500" },
  { type: "wow",   emoji: "😮", label: "Wow",   color: "text-yellow-500" },
  { type: "sad",   emoji: "😢", label: "Sad",   color: "text-yellow-500" },
  { type: "angry", emoji: "😡", label: "Angry", color: "text-orange-500" },
];

const SOCIAL_OPTIONS: {
  platform: SocialPlatform; label: string; color: string; icon: React.ReactNode;
}[] = [
  {
    platform: "whatsapp", label: "WhatsApp", color: "hover:text-[#25D366]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.57a.5.5 0 0 0 .61.666l5.9-1.547A11.956 11.956 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.003-1.37l-.359-.213-3.714.975.99-3.617-.233-.372A9.82 9.82 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
      </svg>
    ),
  },
  { platform: "facebook",  label: "Facebook",  color: "hover:text-[#1877F2]", icon: <Facebook className="h-4 w-4" /> },
  { platform: "linkedin",  label: "LinkedIn",  color: "hover:text-[#0A66C2]", icon: <Linkedin className="h-4 w-4" /> },
  {
    platform: "instagram", label: "Instagram", color: "hover:text-[#E1306C]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  { platform: "copy", label: "Copy link", color: "hover:text-foreground", icon: <Copy className="h-4 w-4" /> },
];

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (name?: string | null) =>
  !name ? "U" : name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const buildPostUrl = (postId: string) =>
  `${window.location.origin}/feed?post=${postId}`;

const getReactionInfo = (type: ReactionType | null) =>
  REACTIONS.find((r) => r.type === type) ?? REACTIONS[0];

// ── ReactionBar ───────────────────────────────────────────────────────────────

function ReactionBar({
  post, localReaction, onReact, isLoggedIn,
}: {
  post: Post;
  localReaction?: { type: ReactionType | null; counts: Record<string, number>; total: number };
  onReact: (type: ReactionType) => void;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const currentReaction = localReaction?.type ?? post.userReaction;
  const total = localReaction?.total ?? post.totalReactions;
  const info  = currentReaction ? getReactionInfo(currentReaction) : null;

  return (
    <Popover open={isLoggedIn ? open : false} onOpenChange={isLoggedIn ? setOpen : undefined}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost" size="sm"
          className={`flex-1 gap-1 ${info ? info.color : "text-muted-foreground"}`}
          onClick={() => { if (!isLoggedIn) { toast({ title: "Sign in to react", variant: "destructive" }); return; } onReact(currentReaction ?? "like"); }}
          onMouseEnter={() => isLoggedIn && setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <span className="text-base leading-none">{info ? info.emoji : "👍"}</span>
          <span className="text-xs">
            {info ? info.label : "Like"}
            {total > 0 && <span className="ml-1 text-muted-foreground">({total})</span>}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2 flex gap-1" side="top"
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      >
        {REACTIONS.map((r) => (
          <motion.button
            key={r.type}
            whileHover={{ scale: 1.3, y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            onClick={() => { onReact(r.type); setOpen(false); }}
            className="flex flex-col items-center gap-0.5 px-1" title={r.label}
          >
            <span className="text-2xl leading-none">{r.emoji}</span>
            <span className="text-[9px] text-muted-foreground">{r.label}</span>
          </motion.button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ── ShareMenu ─────────────────────────────────────────────────────────────────

function ShareMenu({ post, onTracked }: { post: Post; onTracked: () => void }) {
  const [copied, setCopied] = useState(false);
  const handle = async (platform: SocialPlatform) => {
    await shareToSocial(platform, post, buildPostUrl(post.id), () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied!" });
    });
    feedApi.trackShare(post.id).catch(() => {});
    onTracked();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground">
          <Share2 className="h-4 w-4 mr-1" /> Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="center">
        <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium uppercase tracking-wide">Share to</p>
        {SOCIAL_OPTIONS.map(({ platform, label, icon, color }) => (
          <button
            key={platform}
            onClick={() => handle(platform)}
            className={`flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md transition-colors text-muted-foreground ${color} hover:bg-muted`}
          >
            {platform === "copy" && copied ? <Check className="h-4 w-4 text-success" /> : icon}
            <span>{platform === "copy" && copied ? "Copied!" : label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ── Visibility picker ─────────────────────────────────────────────────────────

function VisibilityPicker({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground text-xs">
          {value === "public"
            ? <><Globe className="h-3.5 w-3.5" /> Public</>
            : <><Lock className="h-3.5 w-3.5" /> Only me</>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onChange("public")} className="gap-2">
          <Globe className="h-4 w-4" /> Public
          <span className="text-xs text-muted-foreground ml-auto">Everyone</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("private")} className="gap-2">
          <Lock className="h-4 w-4" /> Only me
          <span className="text-xs text-muted-foreground ml-auto">Private</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────

interface LocalReaction { type: ReactionType | null; counts: Record<string, number>; total: number }

function PostCard({
  post,
  localReaction,
  comments,
  isExpanded,
  commentInput,
  isOwner,
  isLoggedIn,
  onReact,
  onToggleComments,
  onCommentChange,
  onCommentSubmit,
  onDelete,
  onShareTracked,
  onFollowToggle,
  onReport,
}: {
  post: Post;
  localReaction?: LocalReaction;
  comments: PostComment[];
  isExpanded: boolean;
  commentInput: string;
  isOwner: boolean;
  isLoggedIn: boolean;
  onReact: (type: ReactionType) => void;
  onToggleComments: () => void;
  onCommentChange: (val: string) => void;
  onCommentSubmit: () => void;
  onDelete: () => void;
  onShareTracked: () => void;
  onFollowToggle: (isFollowing: boolean) => void;
  onReport: () => void;
}) {
  const navigate = useNavigate();
  const reactionCounts = localReaction?.counts ?? post.reactionCounts;
  const total = localReaction?.total ?? post.totalReactions;

  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">

        {/* FoF label */}
        {post.feedSection === "fof" && post.author?.followedByName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Users className="h-3 w-3" />
            <span>Followed by <strong>{post.author.followedByName}</strong></span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <button
            className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity flex-1 min-w-0"
            onClick={() => post.author?.id && navigate(`/profile/${post.author.id}`)}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={post.author?.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getInitials(post.author?.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground text-sm">
                  {post.author?.fullName ?? "Unknown"}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[post.author?.role ?? "student"]}`}
                >
                  {(post.author?.role ?? "student").replace("_", " ")}
                </Badge>
                {post.visibility === "private" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                    <Lock className="h-2.5 w-2.5" /> Only me
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {/* Follow button next to author name */}
            {!isOwner && post.author && (
              <FollowButton
                userId={post.author.id}
                initialFollowing={post.author.isFollowedByViewer}
                onToggle={(isFollowing) => onFollowToggle(isFollowing)}
              />
            )}

            {isLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwner ? (
                    <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={onReport}>
                      <Flag className="h-4 w-4 mr-2" /> Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-foreground text-sm leading-relaxed mb-3 whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Media */}
        {post.mediaUrls.length > 0 && (
          <div className="mb-3 rounded-lg overflow-hidden">
            {post.mediaType === "video"
              ? <video src={post.mediaUrls[0]} controls className="w-full max-h-96" />
              : <img src={post.mediaUrls[0]} alt="Post media" className="w-full max-h-96 object-cover" />}
          </div>
        )}

        {/* Reaction summary */}
        <div className="flex items-center justify-between mb-2">
          {Object.keys(reactionCounts).length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {REACTIONS.filter((r) => reactionCounts[r.type] > 0).slice(0, 3).map((r) => (
                  <span key={r.type} className="text-sm leading-none">{r.emoji}</span>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{total}</span>
            </div>
          ) : <span />}
          <span className="text-xs text-muted-foreground">
            {post.commentsCount + comments.length} comments · {post.sharesCount} shares
          </span>
        </div>

        <Separator className="my-2" />

        {/* Actions */}
        <div className="flex items-center">
          <ReactionBar
            post={post} localReaction={localReaction}
            onReact={onReact} isLoggedIn={isLoggedIn}
          />
          <Button variant="ghost" size="sm" onClick={onToggleComments} className="flex-1 text-muted-foreground">
            <MessageCircle className="h-4 w-4 mr-1" /> Comment
          </Button>
          <ShareMenu post={post} onTracked={onShareTracked} />
        </div>

        {/* Comments */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Separator className="my-2" />
              <div className="space-y-3 mt-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-7 w-7 shrink-0 cursor-pointer"
                      onClick={() => c.author?.id && navigate(`/profile/${c.author.id}`)}>
                      <AvatarImage src={c.author?.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                        {getInitials(c.author?.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-xl px-3 py-2 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => c.author?.id && navigate(`/profile/${c.author.id}`)}
                          className="text-xs font-semibold text-foreground hover:underline"
                        >
                          {c.author?.fullName ?? "Unknown"}
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}

                {isLoggedIn ? (
                  <div className="flex gap-2 items-center">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">ME</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <Input
                        placeholder="Write a comment…"
                        value={commentInput}
                        onChange={(e) => onCommentChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") onCommentSubmit(); }}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="icon" onClick={onCommentSubmit}
                        disabled={!commentInput.trim()}
                        className="h-8 w-8 shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    <a href="/login" className="text-accent underline underline-offset-2">Sign in</a> to comment.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyTab({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ── Main FeedPage ─────────────────────────────────────────────────────────────

type LocalReactionMap = Record<string, LocalReaction>;

export default function FeedPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Report content
  const [reportTarget, setReportTarget] = useState<{ id: string; title: string } | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("Spam");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const closeReportDialog = () => {
    setReportTarget(null);
    setReportReason("Spam");
    setReportDescription("");
  };

  const handleSubmitReport = async () => {
    if (!reportTarget) return;
    if (!reportDescription.trim() || reportDescription.trim().length < 10) {
      toast({ title: "Please add more detail", description: "Description must be at least 10 characters.", variant: "destructive" });
      return;
    }
    setIsSubmittingReport(true);
    try {
      const ok = await moderationService.reportContent({
        contentType: "Post",
        contentId: reportTarget.id,
        contentTitle: reportTarget.title,
        reason: reportReason,
        description: reportDescription.trim(),
      });
      if (ok) {
        toast({ title: "Report submitted", description: "Thanks — our moderation team will review it." });
        closeReportDialog();
      } else {
        toast({ title: "You've already reported this", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Couldn't submit report", description: err?.response?.data?.message, variant: "destructive" });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Compose
  const [content, setContent]               = useState("");
  const [visibility, setVisibility]         = useState<Visibility>("public");
  const [mediaFile, setMediaFile]           = useState<{ file: File; url: string; type: "image" | "video" } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading]       = useState(false);
  const [showEmoji, setShowEmoji]           = useState(false);
  const [isPosting, setIsPosting]           = useState(false);
  const imageRef  = useRef<HTMLInputElement>(null);
  const videoRef  = useRef<HTMLInputElement>(null);
  const taRef     = useRef<HTMLTextAreaElement>(null);

  // Feed interaction state
  const [expanded, setExpanded]         = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [localComments, setLocalComments] = useState<Record<string, PostComment[]>>({});
  const [localReactions, setLocalReactions] = useState<LocalReactionMap>({});

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: feedResult, isLoading, isError } = useQuery({
    queryKey: ["feed-posts", user?.id ?? "guest"],
    queryFn: () => feedApi.getFeed(1, 20),
    staleTime: 0,
  });

  const followingPosts = feedResult?.followingPosts ?? [];
  const fofPosts       = feedResult?.fofPosts ?? [];
  const publicPosts    = feedResult?.publicPosts ?? [];

  // ── Create post ────────────────────────────────────────────────────────────
  const handleCreatePost = async () => {
    if ((!content.trim() && !mediaFile) || isPosting) return;
    setIsPosting(true);
    try {
      let mediaUrls: string[] = [];
      let mediaType = "text";

      if (mediaFile) {
        setIsUploading(true);
        const timer = setInterval(() => setUploadProgress((p) => Math.min(p + 10, 90)), 150);
        try {
          const res = await feedApi.uploadMedia(mediaFile.file);
          mediaUrls = [res.url];
          mediaType = res.mediaType;
        } finally {
          clearInterval(timer);
          setUploadProgress(100);
          setTimeout(() => { setUploadProgress(0); setIsUploading(false); }, 400);
        }
      }

      await feedApi.createPost({ content: content.trim(), mediaUrls, mediaType, visibility });
      setContent(""); setMediaFile(null); setShowEmoji(false);
      // Remove cached result entirely so the refetch is guaranteed fresh
      await queryClient.removeQueries({ queryKey: ["feed-posts", user?.id ?? "guest"] });
      await queryClient.refetchQueries({ queryKey: ["feed-posts", user?.id ?? "guest"] });
      toast({ title: "Post published! 🎉" });
    } catch {
      toast({ title: "Failed to create post", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (postId: string) => {
    try {
      await feedApi.deletePost(postId);
      queryClient.invalidateQueries({ queryKey: ["feed-posts", user?.id ?? "guest"] });
      toast({ title: "Post deleted." });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  // ── Media ──────────────────────────────────────────────────────────────────
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = type === "image" ? ALLOWED_IMAGE : ALLOWED_VIDEO;
    if (!allowed.includes(file.type)) {
      toast({ title: `Invalid ${type} type`, variant: "destructive" }); return;
    }
    setMediaFile({ file, url: URL.createObjectURL(file), type });
    e.target.value = "";
  };

  const insertEmoji = useCallback((emoji: { native: string }) => {
    const ta = taRef.current;
    if (!ta) { setContent((c) => c + emoji.native); return; }
    const start = ta.selectionStart ?? content.length;
    const end   = ta.selectionEnd   ?? content.length;
    setContent(content.slice(0, start) + emoji.native + content.slice(end));
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + emoji.native.length;
      ta.focus();
    });
  }, [content]);

  // ── React ──────────────────────────────────────────────────────────────────
  const handleReact = useCallback(async (post: Post, type: ReactionType) => {
    if (!user) { toast({ title: "Sign in to react", variant: "destructive" }); return; }
    const current = localReactions[post.id] ?? {
      type: post.userReaction, counts: { ...post.reactionCounts }, total: post.totalReactions,
    };
    const toggling = current.type === type;
    const newType  = toggling ? null : type;
    const newCounts = { ...current.counts };
    if (current.type) {
      newCounts[current.type] = Math.max(0, (newCounts[current.type] ?? 0) - 1);
      if (!newCounts[current.type]) delete newCounts[current.type];
    }
    if (newType) newCounts[newType] = (newCounts[newType] ?? 0) + 1;
    const newTotal = Object.values(newCounts).reduce((a, b) => a + b, 0);
    setLocalReactions((prev) => ({ ...prev, [post.id]: { type: newType, counts: newCounts, total: newTotal } }));
    try {
      const res = await feedApi.react(post.id, toggling ? null : type);
      setLocalReactions((prev) => ({ ...prev, [post.id]: { type: res.userReaction, counts: res.reactionCounts, total: res.totalReactions } }));
    } catch {
      setLocalReactions((prev) => ({ ...prev, [post.id]: current }));
      toast({ title: "Failed", variant: "destructive" });
    }
  }, [user, localReactions]);

  // ── Comments ───────────────────────────────────────────────────────────────
  const toggleComments = useCallback(async (postId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
    if (!localComments[postId]) {
      try {
        const c = await feedApi.getComments(postId);
        setLocalComments((prev) => ({ ...prev, [postId]: c }));
      } catch {
        setLocalComments((prev) => ({ ...prev, [postId]: [] }));
      }
    }
  }, [localComments]);

  const handleComment = useCallback(async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) { if (!user) toast({ title: "Sign in to comment", variant: "destructive" }); return; }
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    try {
      const c = await feedApi.addComment(postId, text);
      setLocalComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), c] }));
    } catch {
      setCommentInputs((prev) => ({ ...prev, [postId]: text }));
      toast({ title: "Failed to comment", variant: "destructive" });
    }
  }, [commentInputs, user]);

  // ── Render helper ──────────────────────────────────────────────────────────
  const renderPost = (post: Post, index: number) => (
    <motion.div
      key={post.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <PostCard
        post={post}
        localReaction={localReactions[post.id]}
        comments={localComments[post.id] ?? []}
        isExpanded={expanded.has(post.id)}
        commentInput={commentInputs[post.id] ?? ""}
        isOwner={user?.id === post.authorId}
        isLoggedIn={!!user}
        onReact={(type) => handleReact(post, type)}
        onToggleComments={() => toggleComments(post.id)}
        onCommentChange={(val) => setCommentInputs((prev) => ({ ...prev, [post.id]: val }))}
        onCommentSubmit={() => handleComment(post.id)}
        onDelete={() => handleDelete(post.id)}
        onShareTracked={() => queryClient.invalidateQueries({ queryKey: ["feed-posts", user?.id ?? "guest"] })}
        onFollowToggle={() => queryClient.invalidateQueries({ queryKey: ["feed-posts", user?.id ?? "guest"] })}
        onReport={() => setReportTarget({ id: post.id, title: post.content?.slice(0, 100) || "Post" })}
      />
    </motion.div>
  );

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">

        <div>
          <h1 className="text-3xl font-bold text-foreground">Feed</h1>
          <p className="text-muted-foreground mt-1">See what the community is sharing</p>
        </div>

        {/* ── Compose ── */}
        {user ? (
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">ME</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    ref={taRef}
                    placeholder="What's on your mind?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[80px] resize-none border-border bg-muted/50 focus:bg-background"
                  />

                  {mediaFile && (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      {mediaFile.type === "image"
                        ? <img src={mediaFile.url} alt="preview" className="w-full max-h-60 object-cover" />
                        : <video src={mediaFile.url} controls className="w-full max-h-60" />}
                      <button
                        onClick={() => setMediaFile(null)}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                      ><X className="h-3 w-3" /></button>
                    </div>
                  )}

                  {isUploading && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Uploading…</p>
                      <Progress value={uploadProgress} className="h-1" />
                    </div>
                  )}

                  {showEmoji && (
                    <div className="relative z-50">
                      <Picker data={data} onEmojiSelect={insertEmoji} theme="auto" previewPosition="none" skinTonePosition="none" />
                    </div>
                  )}

                  <input ref={imageRef} type="file" accept={ALLOWED_IMAGE.join(",")} className="hidden" onChange={(e) => pickFile(e, "image")} />
                  <input ref={videoRef} type="file" accept={ALLOWED_VIDEO.join(",")} className="hidden" onChange={(e) => pickFile(e, "video")} />

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-1 flex-wrap">
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => imageRef.current?.click()} disabled={!!mediaFile}>
                        <Image className="h-4 w-4 mr-1" /> Photo
                      </Button>
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => videoRef.current?.click()} disabled={!!mediaFile}>
                        <Video className="h-4 w-4 mr-1" /> Video
                      </Button>
                      <Button variant="ghost" size="sm" className={`text-muted-foreground ${showEmoji ? "bg-muted" : ""}`} onClick={() => setShowEmoji((v) => !v)}>
                        <Smile className="h-4 w-4 mr-1" /> Emoji
                      </Button>
                      <VisibilityPicker value={visibility} onChange={setVisibility} />
                    </div>
                    <Button
                      onClick={handleCreatePost}
                      disabled={(!content.trim() && !mediaFile) || isPosting || isUploading}
                      size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {isPosting || isUploading ? "Posting…" : "Post"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-border bg-muted/30">
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                <a href="/login" className="text-accent underline underline-offset-2">Sign in</a> to post, react, and comment.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border animate-pulse">
                <CardContent className="p-4">
                  <div className="flex gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 bg-muted rounded w-32" />
                      <div className="h-2 bg-muted rounded w-20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <Card className="border-destructive/20">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-destructive">Failed to load feed.</p>
              <Button variant="outline" size="sm" className="mt-3"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["feed-posts", user?.id ?? "guest"] })}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Tabs: Following / Suggested / Public ── */}
        {!isLoading && !isError && (
          <Tabs defaultValue="following" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="following" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Following</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{followingPosts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="suggested" className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Suggested</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{fofPosts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="public" className="gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Public</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{publicPosts.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="following" className="space-y-3 mt-4">
              <AnimatePresence>
                {followingPosts.length > 0
                  ? followingPosts.map((post, i) => renderPost(post, i))
                  : <EmptyTab text="Posts from people you follow will show up here." />}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="suggested" className="space-y-3 mt-4">
              <AnimatePresence>
                {fofPosts.length > 0
                  ? fofPosts.map((post, i) => renderPost(post, i))
                  : <EmptyTab text="No suggested posts right now — follow more people to see friends-of-friends here." />}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="public" className="space-y-3 mt-4">
              <AnimatePresence>
                {publicPosts.length > 0
                  ? publicPosts.map((post, i) => renderPost(post, i))
                  : <EmptyTab text="No public posts yet. Be the first to share something!" />}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        )}

      </div>

      <Dialog open={!!reportTarget} onOpenChange={(open) => !open && closeReportDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
            <DialogDescription>
              Let us know what's wrong — our moderation team will review it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spam">Spam</SelectItem>
                  <SelectItem value="Harassment">Harassment</SelectItem>
                  <SelectItem value="InappropriateContent">Inappropriate content</SelectItem>
                  <SelectItem value="Copyright">Copyright violation</SelectItem>
                  <SelectItem value="Misinformation">Misinformation</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-desc">Details</Label>
              <Textarea
                id="report-desc"
                placeholder="Tell us more about the issue (at least 10 characters)..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeReportDialog} disabled={isSubmittingReport}>Cancel</Button>
            <Button onClick={handleSubmitReport} disabled={isSubmittingReport}>
              {isSubmittingReport && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}