import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image, Video, Send, MoreHorizontal, Trash2, X, Pencil,
  Check, Globe, Lock, MessageSquare, Heart, MessageCircle, Share2, Smile,
} from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { feedApi, type Post, type Visibility } from "../services/feedService.ts";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];

const getInitials = (name?: string | null) =>
  !name ? "U" : name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

// ── Visibility picker (compact, shared by compose + edit) ──────────────────────

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

// ── MyPostCard ────────────────────────────────────────────────────────────────

function MyPostCard({
  post, isEditing, onStartEdit, onCancelEdit, onSave, onDelete, isSaving,
}: {
  post: Post;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (content: string, visibility: Visibility) => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  const [draft, setDraft]           = useState(post.content);
  const [draftVisibility, setDraftVisibility] = useState<Visibility>(post.visibility);
  const [showEditEmoji, setShowEditEmoji]     = useState(false);
  const editTaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = () => {
    setDraft(post.content);
    setDraftVisibility(post.visibility);
    setShowEditEmoji(false);
    onStartEdit();
  };

  const insertEmoji = (emoji: { native: string }) => {
    const ta = editTaRef.current;
    if (!ta) { setDraft((c) => c + emoji.native); return; }
    const start = ta.selectionStart ?? draft.length;
    const end   = ta.selectionEnd   ?? draft.length;
    setDraft(draft.slice(0, start) + emoji.native + draft.slice(end));
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + emoji.native.length;
      ta.focus();
    });
  };

  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={post.author?.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getInitials(post.author?.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground text-sm">
                  {post.author?.fullName ?? "You"}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                  {post.visibility === "private"
                    ? <><Lock className="h-2.5 w-2.5" /> Only me</>
                    : <><Globe className="h-2.5 w-2.5" /> Public</>}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                {post.updatedAt && post.updatedAt !== post.createdAt && " · edited"}
              </p>
            </div>
          </div>

          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={startEdit}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              ref={editTaRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[80px] resize-none border-border bg-muted/50 focus:bg-background"
            />
            {showEditEmoji && (
              <div className="relative z-50">
                <Picker data={data} onEmojiSelect={insertEmoji} theme="auto" previewPosition="none" skinTonePosition="none" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <VisibilityPicker value={draftVisibility} onChange={setDraftVisibility} />
                <Button
                  variant="ghost" size="sm"
                  className={`text-muted-foreground ${showEditEmoji ? "bg-muted" : ""}`}
                  onClick={() => setShowEditEmoji((v) => !v)}
                >
                  <Smile className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onCancelEdit} disabled={isSaving}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={!draft.trim() || isSaving}
                  onClick={() => onSave(draft.trim(), draftVisibility)}
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> {isSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-foreground text-sm leading-relaxed mb-3 whitespace-pre-wrap">
              {post.content}
            </p>
            {post.mediaUrls.length > 0 && (
              <div className="mb-3 rounded-lg overflow-hidden">
                {post.mediaType === "video"
                  ? <video src={post.mediaUrls[0]} controls className="w-full max-h-96" />
                  : <img src={post.mediaUrls[0]} alt="Post media" className="w-full max-h-96 object-cover" />}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border mt-1">
              <span className="flex items-center gap-1 pt-2"><Heart className="h-3.5 w-3.5" /> {post.totalReactions}</span>
              <span className="flex items-center gap-1 pt-2"><MessageCircle className="h-3.5 w-3.5" /> {post.commentsCount}</span>
              <span className="flex items-center gap-1 pt-2"><Share2 className="h-3.5 w-3.5" /> {post.sharesCount}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── MyFeedsPage ───────────────────────────────────────────────────────────────

export default function MyFeedsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Compose
  const [content, setContent]               = useState("");
  const [visibility, setVisibility]         = useState<Visibility>("public");
  const [mediaFile, setMediaFile]           = useState<{ file: File; url: string; type: "image" | "video" } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading]       = useState(false);
  const [isPosting, setIsPosting]           = useState(false);
  const [showEmoji, setShowEmoji]           = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const taRef    = useRef<HTMLTextAreaElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId]   = useState<string | null>(null);

  const queryKey = ["my-feed-posts", user?.id ?? "guest"];

  const { data: posts = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => feedApi.getUserPosts(user!.id, 1, 50),
    enabled: !!user,
    staleTime: 0,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  // ── Media picking ─────────────────────────────────────────────────────────
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

  // ── Create ────────────────────────────────────────────────────────────────
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
      setContent(""); setMediaFile(null); setVisibility("public"); setShowEmoji(false);
      refresh();
      toast({ title: "Post published! 🎉" });
    } catch {
      toast({ title: "Failed to create post", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const handleSaveEdit = async (postId: string, newContent: string, newVisibility: Visibility) => {
    setSavingId(postId);
    try {
      await feedApi.updatePost(postId, { content: newContent, visibility: newVisibility });
      setEditingId(null);
      refresh();
      toast({ title: "Post updated" });
    } catch {
      toast({ title: "Failed to update post", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (postId: string) => {
    try {
      await feedApi.deletePost(postId);
      refresh();
      toast({ title: "Post deleted." });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-6">
          <Card className="border-dashed border-border bg-muted/30">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                <a href="/login" className="text-accent underline underline-offset-2">Sign in</a> to manage your posts.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">

        <div>
          <h1 className="text-3xl font-bold text-foreground">My Feed</h1>
          <p className="text-muted-foreground mt-1">Manage everything you've posted</p>
        </div>

        {/* ── Compose ── */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  ref={taRef}
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[80px] resize-none border-border bg-muted/50 focus:bg-background"
                />

                {showEmoji && (
                  <div className="relative z-50">
                    <Picker data={data} onEmojiSelect={insertEmoji} theme="auto" previewPosition="none" skinTonePosition="none" />
                  </div>
                )}

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
              <p className="text-sm text-destructive">Failed to load your posts.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={refresh}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── My posts ── */}
        {!isLoading && !isError && (
          <div className="space-y-3">
            <AnimatePresence>
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <MyPostCard
                    post={post}
                    isEditing={editingId === post.id}
                    isSaving={savingId === post.id}
                    onStartEdit={() => setEditingId(post.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={(c, v) => handleSaveEdit(post.id, c, v)}
                    onDelete={() => handleDelete(post.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {posts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">You haven't posted anything yet. Share something above!</p>
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}