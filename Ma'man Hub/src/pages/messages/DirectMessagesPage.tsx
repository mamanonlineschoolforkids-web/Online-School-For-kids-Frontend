// src/pages/DirectMessagesPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// 1-to-1 Direct Messages — real SignalR + REST, emoji picker, file attach,
// inline edit (no modal), ?userId= deep-link to start a conversation
// ─────────────────────────────────────────────────────────────────────────────

import {
  useState, useEffect, useRef, useCallback,
  type KeyboardEvent,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Search, MoreVertical, Phone, Video, Check, CheckCheck,
  X, Edit2, Trash2, Reply, CornerDownRight, ChevronDown,
  Loader2, MessageSquare, Smile, Paperclip, Image as ImageIcon,
  File as FileIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { chatSignalR } from "@/services/chatSignalR";
import { chatApi } from "@/services/chatService";
import type { ChatMessageDto } from "@/services/chatService";
import { cn } from "@/lib/utils";
import { EditPreview } from "@/components/chat/EditPreview";

// ── Emoji data ─────────────────────────────────────────────────────────────────

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Reactions", emojis: ["👍","❤️","😂","😮","😢","🙏","🔥","🎉","✅","💯","😍","🤔"] },
  { label: "Smileys", emojis: ["😀","😃","😄","😁","😆","😅","🤣","😊","😇","🙂","😉","😌","😋","😛","😝","😜","🤪","😎","🤓","🧐","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡"] },
  { label: "Gestures", emojis: ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🙏","🤝","💪"] },
  { label: "Objects", emojis: ["💬","📩","📧","📝","📌","📎","🔗","💡","🔔","🔕","📢","📣","🎵","🎶","🎤","🎧","🎯","🏆","🥇","🎁","🎊","🎈","🎀","🌟","⭐","✨","💫","🔑","🗝️","🔒","🔓"] },
];

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name: string) {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2);
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className={cn(
      "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background transition-colors",
      online ? "bg-emerald-500" : "bg-muted-foreground/30"
    )} />
  );
}

function TypingBubble({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2"
    >
      <div className="flex gap-1 bg-muted rounded-2xl px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{name} is typing…</span>
    </motion.div>
  );
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded-full">
        {date}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ── Emoji Picker ───────────────────────────────────────────────────────────────

function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [activeGroup, setActiveGroup] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full mb-2 right-0 w-72 bg-popover border rounded-2xl shadow-xl overflow-hidden z-50"
    >
      <div className="flex border-b">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setActiveGroup(i)}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors",
              activeGroup === i
                ? "bg-accent/10 text-accent border-b-2 border-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
        {EMOJI_GROUPS[activeGroup].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="p-1.5 text-lg hover:bg-muted rounded-lg transition-colors hover:scale-110 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── File attachment preview ────────────────────────────────────────────────────

interface AttachedFile {
  file: File;
  preview?: string;
  type: "image" | "file";
}

function FilePreview({
  attached,
  onRemove,
  uploading,
}: {
  attached: AttachedFile;
  onRemove: () => void;
  uploading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-2 px-4 py-2 border-t bg-muted/30"
    >
      {attached.type === "image" && attached.preview ? (
        <img
          src={attached.preview}
          alt="attachment"
          className="h-12 w-12 rounded-lg object-cover border"
        />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-muted border flex items-center justify-center">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attached.file.name}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
          {uploading ? "Uploading…" : `${(attached.file.size / 1024).toFixed(1)} KB`}
        </p>
      </div>
      <button
        onClick={onRemove}
        disabled={uploading}
        className="p-1 hover:bg-muted rounded-full shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

// ── Reply preview ──────────────────────────────────────────────────────────────

function ReplyPreview({ reply, onCancel }: { reply: ChatMessageDto; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="flex items-center gap-2 px-4 py-2 border-t bg-muted/30 text-sm overflow-hidden"
    >
      <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-accent">{reply.senderName}</span>
        <span className="text-muted-foreground ml-2 truncate">
          {reply.isDeleted ? "Deleted message" : reply.content}
        </span>
      </div>
      <button onClick={onCancel} className="p-1 hover:bg-muted rounded-full shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  msg, isMe, myId, onReply, onEdit, onDelete, onReact,
}: {
  msg: ChatMessageDto;
  isMe: boolean;
  myId: string;
  onReply: (m: ChatMessageDto) => void;
  onEdit: (m: ChatMessageDto) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
}) {
  const grouped = msg.reactions.reduce<Record<string, string[]>>((acc, r) => {
    acc[r.emoji] = [...(acc[r.emoji] ?? []), r.userId];
    return acc;
  }, {});

  const isRead = msg.readBy.filter((id) => id !== myId).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group flex gap-2.5 items-end mb-1", isMe && "flex-row-reverse")}
    >
      <div className="w-7 shrink-0" />

      <div className={cn("max-w-[65%] min-w-0", isMe && "items-end flex flex-col")}>
        {msg.replyTo && (
          <div className={cn(
            "flex items-start gap-1.5 mb-1 px-3 py-1.5 rounded-xl text-xs border-l-2 border-accent/60 bg-muted/50",
            isMe && "self-end"
          )}>
            <CornerDownRight className="h-3 w-3 text-accent/70 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-semibold text-accent/80">{msg.replyTo.senderName}</span>
              <p className="text-muted-foreground truncate">{msg.replyTo.content}</p>
            </div>
          </div>
        )}

        {msg.type === "image" && msg.fileUrl && (
          <img
            src={msg.fileUrl}
            alt={msg.fileName ?? "image"}
            className={cn(
              "max-w-[200px] rounded-2xl mb-1 border",
              isMe ? "rounded-br-sm" : "rounded-bl-sm"
            )}
          />
        )}
        {msg.type === "file" && msg.fileUrl && (
          <a
            href={msg.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-2xl mb-1 text-sm border bg-muted hover:bg-muted/70 transition-colors",
              isMe ? "rounded-br-sm" : "rounded-bl-sm"
            )}
          >
            <FileIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{msg.fileName ?? "File"}</span>
          </a>
        )}

        {msg.content && (
          <div className="relative">
            <div className={cn(
              "relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words",
              isMe
                ? "bg-accent text-accent-foreground rounded-br-sm"
                : "bg-muted rounded-bl-sm",
              msg.isDeleted && "opacity-50 italic"
            )}>
              {msg.content}
              {msg.isEdited && !msg.isDeleted && (
                <span className="ml-1.5 text-[10px] opacity-60">(edited)</span>
              )}
              <div className={cn(
                "flex items-center gap-1 mt-0.5 text-[10px] opacity-60",
                isMe ? "justify-end" : "justify-start"
              )}>
                <span>{fmtTime(msg.timestamp)}</span>
                {isMe && !msg.isDeleted && (
                  isRead
                    ? <CheckCheck className="h-3 w-3 text-emerald-400" />
                    : <Check className="h-3 w-3" />
                )}
              </div>

              {!msg.isDeleted && (
                <div className={cn(
                  "absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity",
                  "flex items-center gap-0.5 bg-background border rounded-full shadow-lg px-1.5 py-1 z-10",
                  isMe ? "right-0" : "left-0"
                )}>
                  {QUICK_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => onReact(msg.id, e)}
                      className="p-0.5 hover:scale-125 transition-transform text-base"
                    >{e}</button>
                  ))}
                  <div className="w-px h-4 bg-border mx-0.5" />
                  <button onClick={() => onReply(msg)} className="p-1 hover:bg-muted rounded-full" title="Reply">
                    <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  {isMe && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-muted rounded-full">
                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(msg)}>
                          <Edit2 className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(msg.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {Object.keys(grouped).length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1", isMe && "justify-end")}>
            {Object.entries(grouped).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                  users.includes(myId)
                    ? "bg-accent/20 border-accent/40 text-accent"
                    : "bg-muted border-border hover:bg-muted/70"
                )}
              >
                {emoji} <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Conversation sidebar item ──────────────────────────────────────────────────

function ConvItem({
  name, avatar, sub, time, unread, active, online, onClick,
}: {
  name: string; avatar?: string; sub: string; time?: string;
  unread: number; active: boolean; online: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-3 py-3 flex items-start gap-3 rounded-xl transition-all text-left",
        active ? "bg-accent/10 shadow-sm" : "hover:bg-muted/50"
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={avatar} />
          <AvatarFallback className="text-sm font-semibold">{initials(name)}</AvatarFallback>
        </Avatar>
        <OnlineDot online={online} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <p className={cn("text-sm truncate", active ? "font-semibold" : "font-medium")}>{name}</p>
          {time && <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>}
        </div>
        <p className={cn(
          "text-xs truncate mt-0.5",
          unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"
        )}>{sub || "No messages yet"}</p>
      </div>
      {unread > 0 && (
        <span className="shrink-0 min-w-5 h-5 flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-1">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DirectMessagesPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    conversations, activeId, activeType,
    messages, hasMore, typingUsers,
    isLoadingConvs, isLoadingMsgs,
    loadConversations, setActive,
    loadMoreMessages, sendMessage,
    editMessage, deleteMessage, toggleReaction,
    connectSignalR,
  } = useChatStore();

  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageDto | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessageDto | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isStartingConv, setIsStartingConv] = useState(false);
  const handledUserIdRef = useRef<string | null>(null);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [isDeletingConv, setIsDeletingConv] = useState(false);

  const handleDeleteConversation = async () => {
    if (!deletingConvId) return;
    setIsDeletingConv(true);
    try {
      await chatApi.deleteConversation(deletingConvId);
      await loadConversations();
    } finally {
      setIsDeletingConv(false);
      setDeletingConvId(null);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef  = useRef<HTMLInputElement>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myId = user?.id ?? "";

  useEffect(() => {
    if (token) {
      connectSignalR(token);
      loadConversations();
    }
  }, [token]);

  // ── Deep-link: /messages?userId=xyz starts (or opens) a DM ──────────────────
  useEffect(() => {
    const targetUserId = searchParams.get("userId");
    if (!targetUserId || !token) return;
    if (handledUserIdRef.current === targetUserId) return; // already handled this deep-link
    handledUserIdRef.current = targetUserId;

    (async () => {
      setIsStartingConv(true);
      try {
        // Always defer to the backend's idempotent get-or-create — it returns
        // the existing conversation (with full history) if one already exists,
        // so there's no need to (and no risk in not) pre-checking a local list
        // that may not have finished loading yet.
        const conv = await chatApi.startConversation(targetUserId);
        await loadConversations();
        await setActive("dm", conv.id);
      } finally {
        setIsStartingConv(false);
        // Clear the query param so refreshing doesn't re-trigger this
        searchParams.delete("userId");
        setSearchParams(searchParams, { replace: true });
      }
    })();
  }, [searchParams, token]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150)
      el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
    if (el.scrollTop < 80 && activeId && hasMore[activeId]) {
      const prev = el.scrollHeight;
      loadMoreMessages(activeId, "dm").then(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current)
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prev;
        });
      });
    }
  }, [activeId, hasMore]);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (editingMsg) return;
    if (!typingTimer.current && activeId) chatSignalR.sendTyping(activeId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (activeId) chatSignalR.sendTyping(activeId, false);
      typingTimer.current = null;
    }, 2500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttached({
      file,
      preview: type === "image" ? (reader.result as string) : undefined,
      type,
    });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Inline edit ───────────────────────────────────────────────────────────────

  const startEdit = (msg: ChatMessageDto) => {
    setEditingMsg(msg);
    setReplyTo(null);
    setAttached(null);
    setInput(msg.content);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setInput("");
  };

  const handleSend = async () => {
    if ((!input.trim() && !attached) || isUploading) return;

    if (editingMsg) {
      const trimmed = input.trim();
      if (trimmed && trimmed !== editingMsg.content) {
        await editMessage(editingMsg.id, trimmed);
      }
      setEditingMsg(null);
      setInput("");
      setShowEmoji(false);
      inputRef.current?.focus();
      return;
    }

    try {
      let fileMeta: { type: "image" | "file"; fileUrl: string; fileName: string } | undefined;

      if (attached) {
        setIsUploading(true);
        const uploaded = await chatApi.uploadChatFile(attached.file);
        fileMeta = {
          type: attached.type,
          fileUrl: uploaded.url,
          fileName: uploaded.fileName ?? attached.file.name,
        };
      }

      await sendMessage(input.trim(), { replyToMessageId: replyTo?.id, ...fileMeta });

      setInput("");
      setReplyTo(null);
      setAttached(null);
      setShowEmoji(false);
      if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; }
      if (activeId) chatSignalR.sendTyping(activeId, false);
      inputRef.current?.focus();
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape" && editingMsg) cancelEdit();
  };

  const activeConv = conversations.find((c) => c.id === activeId && activeType === "dm");
  const activeMessages = (activeId ? messages[activeId] : undefined) ?? [];
  const typingSet = activeId ? (typingUsers[activeId] ?? new Set()) : new Set<string>();

  const filteredConvs = conversations.filter((c) =>
    c.participantName.toLowerCase().includes(search.toLowerCase())
  );

  function buildRows(msgs: ChatMessageDto[]) {
    const rows: (ChatMessageDto | { separator: string; key: string })[] = [];
    let lastDate = "";
    for (const msg of msgs) {
      const d = fmtDate(msg.timestamp);
      if (d !== lastDate) { rows.push({ separator: d, key: `sep-${d}-${msg.id}` }); lastDate = d; }
      rows.push(msg);
    }
    return rows;
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] rounded-2xl border overflow-hidden bg-background shadow-sm">

        {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
        <aside className="w-72 flex flex-col border-r bg-muted/20">
          <div className="p-4 border-b">
            <h2 className="font-bold text-base mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="pl-9 h-8 text-sm bg-background"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {isLoadingConvs || isStartingConv ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              filteredConvs.map((c) => (
                <ConvItem
                  key={c.id}
                  name={c.participantName}
                  avatar={c.participantAvatar}
                  sub={c.lastMessage}
                  time={c.lastMessageAt ? fmtDate(c.lastMessageAt) : undefined}
                  unread={c.unreadCount}
                  active={activeId === c.id && activeType === "dm"}
                  online={c.isOnline}
                  onClick={() => {
                    setActive("dm", c.id);
                    cancelEdit();
                    setReplyTo(null);
                  }}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── CHAT ──────────────────────────────────────────────────────────── */}
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="p-6 bg-muted/30 rounded-full">
              <MessageSquare className="h-10 w-10 opacity-30" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">No conversation selected</p>
              <p className="text-xs mt-1 opacity-70">Pick one from the sidebar to start chatting</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0">

            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3 bg-background">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={activeConv.participantAvatar} />
                    <AvatarFallback className="text-sm">{initials(activeConv.participantName)}</AvatarFallback>
                  </Avatar>
                  <OnlineDot online={activeConv.isOnline} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{activeConv.participantName}</p>
                  <p className={cn("text-xs", activeConv.isOnline ? "text-emerald-500" : "text-muted-foreground")}>
                    {activeConv.isOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Voice calling coming soon">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Video calling coming soon">
                  <Video className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/profile/${activeConv.participantId}`)}>
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeletingConvId(activeConv.id)}
                    >
                      Delete Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages area */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 relative"
            >
              {isLoadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {hasMore[activeId!] && (
                    <div className="text-center mb-3">
                      <button
                        onClick={() => loadMoreMessages(activeId!, "dm")}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Load earlier messages
                      </button>
                    </div>
                  )}

                  {buildRows(activeMessages).map((row) => {
                    if ("separator" in row)
                      return <DateSeparator key={row.key} date={row.separator} />;
                    const msg = row as ChatMessageDto;
                    return (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isMe={msg.senderId === myId}
                        myId={myId}
                        onReply={setReplyTo}
                        onEdit={startEdit}
                        onDelete={deleteMessage}
                        onReact={toggleReaction}
                      />
                    );
                  })}

                  <AnimatePresence>
                    {typingSet.size > 0 && (
                      <TypingBubble name={activeConv.participantName} />
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

            {/* Scroll-to-bottom */}
            <AnimatePresence>
              {showScrollBtn && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight)}
                  className="absolute bottom-24 right-6 p-2 bg-accent text-accent-foreground rounded-full shadow-lg z-10"
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Input area */}
            <div className="border-t bg-background">
              <AnimatePresence>
                {editingMsg && <EditPreview msg={editingMsg} onCancel={cancelEdit} />}
              </AnimatePresence>
              <AnimatePresence>
                {!editingMsg && replyTo && (
                  <ReplyPreview reply={replyTo} onCancel={() => setReplyTo(null)} />
                )}
              </AnimatePresence>
              <AnimatePresence>
                {!editingMsg && attached && (
                  <FilePreview
                    attached={attached}
                    onRemove={() => setAttached(null)}
                    uploading={isUploading}
                  />
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 px-3 py-3 relative">
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "image")}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "file")}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={isUploading || !!editingMsg}>
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top">
                    <DropdownMenuItem onClick={() => imgInputRef.current?.click()}>
                      <ImageIcon className="h-4 w-4 mr-2 text-blue-500" />
                      Image
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <FileIcon className="h-4 w-4 mr-2 text-orange-500" />
                      File
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={editingMsg ? "Edit message…" : "Message…"}
                  className={cn("flex-1 h-9 text-sm", editingMsg && "ring-1 ring-amber-400/60")}
                />

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8 shrink-0", showEmoji && "bg-muted")}
                    onClick={() => setShowEmoji((v) => !v)}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  <AnimatePresence>
                    {showEmoji && (
                      <EmojiPicker
                        onSelect={(e) => setInput((v) => v + e)}
                        onClose={() => setShowEmoji(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSend}
                  disabled={(!input.trim() && !attached) || isUploading}
                >
                  {isUploading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : editingMsg
                    ? <Check className="h-3.5 w-3.5" />
                    : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deletingConvId} onOpenChange={(open) => !open && setDeletingConvId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the conversation for both you and the other person, including all messages. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingConv}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingConv}
              onClick={handleDeleteConversation}
            >
              {isDeletingConv ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}