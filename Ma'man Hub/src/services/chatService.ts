// src/services/chatService.ts
// ─────────────────────────────────────────────────────────────────────────────
// All REST calls for chat. Uses your existing `api` axios instance.
// ─────────────────────────────────────────────────────────────────────────────

import api from "./api"; // your existing axios instance

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConversationDto {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageAt?: string;
  unreadCount: number;
  isOnline: boolean;
}

export interface GroupDto {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  courseId?: string;
  membersCount: number;
  lastMessage: string;
  lastMessageAt?: string;
  unreadCount: number;
  myRole: "owner" | "admin" | "member";
}

export interface GroupMemberDto {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: "owner" | "admin" | "member";
  isOnline: boolean;
}

export interface ReplyContextDto {
  messageId: string;
  senderName: string;
  content: string;
}

export interface MessageReactionDto {
  emoji: string;
  userId: string;
}

export interface ChatMessageDto {
  id: string;
  contextId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: "text" | "image" | "file";
  fileUrl?: string;
  fileName?: string;
  timestamp: string;
  isEdited: boolean;
  isDeleted: boolean;
  readBy: string[];
  reactions: MessageReactionDto[];
  replyTo?: ReplyContextDto;
}

export interface PagedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface SendMessageRequest {
  content: string;
  type?: "text" | "image" | "file";
  fileUrl?: string;
  fileName?: string;
  replyToMessageId?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  courseId?: string;
  memberIds: string[];
}

export interface UploadedFileDto {
  url: string;
  fileName: string;
  type?: "image" | "file";
}

// ── New types for settings / invites / members ────────────────────────────────

export type GroupPermissionLevel = "owner" | "admins" | "all";

export interface GroupSettingsDto {
  name: string;
  description?: string;
  avatarUrl?: string;
  whoCanInvite: GroupPermissionLevel;
  whoCanAddMembers: GroupPermissionLevel;
  showOldChatToNewMembers: boolean;
  inviteLinkEnabled: boolean;
}

export interface UpdateGroupSettingsRequest {
  name?: string;
  description?: string;
  avatarUrl?: string;
  whoCanInvite?: GroupPermissionLevel;
  whoCanAddMembers?: GroupPermissionLevel;
  showOldChatToNewMembers?: boolean;
  inviteLinkEnabled?: boolean;
}

export interface InviteLinkDto {
  code: string;
  url: string;
  enabled: boolean;
}

export interface GroupPreviewDto {
  groupId: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  membersCount: number;
}

export interface UserSearchResultDto {
  id: string;
  fullName: string;
  email?: string;
  profilePictureUrl?: string;
}

export interface AddMemberByEmailResponse {
  userFound: boolean;
  added: boolean;
  inviteShareUrl?: string;
  message: string;
}

// ── API ────────────────────────────────────────────────────────────────────────

export const chatApi = {
  // DM Conversations
  getConversations: () =>
    api.get<ConversationDto[]>("/chat/conversations").then((r) => r.data),

  startConversation: (otherUserId: string) =>
    api
      .post<ConversationDto>("/chat/conversations", { otherUserId })
      .then((r) => r.data),

  deleteConversation: (conversationId: string) =>
    api.delete(`/chat/conversations/${conversationId}`),

  // DM Messages
  getDmMessages: (conversationId: string, cursor?: string, pageSize = 30) =>
    api
      .get<PagedResult<ChatMessageDto>>(
        `/chat/conversations/${conversationId}/messages`,
        { params: { cursor, pageSize } }
      )
      .then((r) => r.data),

  sendDmMessage: (conversationId: string, req: SendMessageRequest) =>
    api
      .post<ChatMessageDto>(
        `/chat/conversations/${conversationId}/messages`,
        req
      )
      .then((r) => r.data),

  // Groups
  getGroups: () => api.get<GroupDto[]>("/chat/groups").then((r) => r.data),

  createGroup: (req: CreateGroupRequest) =>
    api.post<GroupDto>("/chat/groups", req).then((r) => r.data),

  deleteGroup: (groupId: string) => api.delete(`/chat/groups/${groupId}`),

  getGroupMembers: (groupId: string) =>
    api
      .get<GroupMemberDto[]>(`/chat/groups/${groupId}/members`)
      .then((r) => r.data),

  addGroupMember: (groupId: string, userId: string) =>
    api.post(`/chat/groups/${groupId}/members`, { userId }).then((r) => r.data),

  removeGroupMember: (groupId: string, userId: string) =>
    api
      .delete(`/chat/groups/${groupId}/members/${userId}`)
      .then((r) => r.data),

  changeMemberRole: (groupId: string, userId: string, role: "member" | "admin") =>
    api.put(`/chat/groups/${groupId}/members/${userId}/role`, JSON.stringify(role), {
      headers: { "Content-Type": "application/json" },
    }),

  // Group Messages
  getGroupMessages: (groupId: string, cursor?: string, pageSize = 30) =>
    api
      .get<PagedResult<ChatMessageDto>>(`/chat/groups/${groupId}/messages`, {
        params: { cursor, pageSize },
      })
      .then((r) => r.data),

  sendGroupMessage: (groupId: string, req: SendMessageRequest) =>
    api
      .post<ChatMessageDto>(`/chat/groups/${groupId}/messages`, req)
      .then((r) => r.data),

  // Message actions
  editMessage: (messageId: string, newContent: string) =>
    api
      .put<ChatMessageDto>(`/chat/messages/${messageId}`, { newContent })
      .then((r) => r.data),

  deleteMessage: (messageId: string) => api.delete(`/chat/messages/${messageId}`),

  toggleReaction: (messageId: string, emoji: string) =>
    api
      .post<MessageReactionDto[]>(
        `/chat/messages/${messageId}/reactions`,
        JSON.stringify(emoji),
        { headers: { "Content-Type": "application/json" } }
      )
      .then((r) => r.data),

  // File upload
  uploadChatFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post<UploadedFileDto>("/upload/chat-media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  getGroupSettings: (groupId: string) =>
    api.get<GroupSettingsDto>(`/chat/groups/${groupId}/settings`).then((r) => r.data),

  updateGroupSettings: (groupId: string, patch: UpdateGroupSettingsRequest) =>
    api
      .put<GroupSettingsDto>(`/chat/groups/${groupId}/settings`, patch)
      .then((r) => r.data),

  // ── Invite links ──────────────────────────────────────────────────────────
  getInviteLink: (groupId: string) =>
    api.get<InviteLinkDto>(`/chat/groups/${groupId}/invite-link`).then((r) => r.data),

  regenerateInviteLink: (groupId: string) =>
    api.post<InviteLinkDto>(`/chat/groups/${groupId}/invite-link`).then((r) => r.data),

  previewInvite: (code: string) =>
    api.get<GroupPreviewDto>(`/chat/groups/join/${code}`).then((r) => r.data),

  joinByInvite: (code: string) =>
    api.post<GroupDto>(`/chat/groups/join/${code}`).then((r) => r.data),

  // ── Member search / add by email ─────────────────────────────────────────
  searchUserByEmail: (email: string) =>
    api
      .get<UserSearchResultDto>(`/chat/users/search`, { params: { email } })
      .then((r) => r.data),

  addMemberByEmail: (
    groupId: string,
    email: string,
    role: "member" | "admin" = "member"
  ) =>
    api
      .post<AddMemberByEmailResponse>(`/chat/groups/${groupId}/members/by-email`, {
        email,
        role,
      })
      .then((r) => r.data),
};