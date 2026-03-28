// ─── User & Auth ────────────────────────────────────────────────────────────

export enum UserRole {
  USER = 'USER',
  FIELD_AGENT = 'FIELD_AGENT',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── Help Request ────────────────────────────────────────────────────────────

export enum RequestStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum RequestPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RequestCategory {
  MEDICAL = 'MEDICAL',
  EMERGENCY = 'EMERGENCY',
  REPAIR = 'REPAIR',
  DELIVERY = 'DELIVERY',
  INSPECTION = 'INSPECTION',
  OTHER = 'OTHER',
}

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  timestamp?: Date;
}

export interface HelpRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  location: GpsLocation;
  address?: string;
  userId: string;
  user?: Partial<User>;
  assignedAgentId?: string;
  assignedAgent?: Partial<User>;
  mediaIds?: string[];
  rating?: number;
  ratingComment?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface RequestLog {
  id: string;
  requestId: string;
  action: string;
  fromStatus?: RequestStatus;
  toStatus?: RequestStatus;
  performedBy: string;
  note?: string;
  createdAt: Date;
}

// ─── Media & Verification ───────────────────────────────────────────────────

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
}

export enum MediaFieldType {
  DELIVERY_PHOTO = 'DELIVERY_PHOTO',
  SITE_IMAGE = 'SITE_IMAGE',
  RECEIPT_PROOF = 'RECEIPT_PROOF',
  VIDEO_PROOF = 'VIDEO_PROOF',
  VOICE_NOTE = 'VOICE_NOTE',
  COMPLAINT_EVIDENCE = 'COMPLAINT_EVIDENCE',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

export interface MediaFile {
  id: string;
  requestId: string;
  uploadedBy: string;
  fieldType: MediaFieldType;
  mediaType: MediaType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Url: string;
  gpsLocation?: GpsLocation;
  capturedAt?: Date;
  verificationStatus: VerificationStatus;
  verificationNote?: string;
  createdAt: Date;
}

export interface VerificationResult {
  mediaId: string;
  status: VerificationStatus;
  gpsMatch: boolean;
  timestampValid: boolean;
  fraudScore: number;
  flags: string[];
  checkedAt: Date;
}

// ─── Notification ───────────────────────────────────────────────────────────

export enum NotificationChannel {
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export enum NotificationType {
  REQUEST_CREATED = 'REQUEST_CREATED',
  REQUEST_ASSIGNED = 'REQUEST_ASSIGNED',
  REQUEST_UPDATED = 'REQUEST_UPDATED',
  REQUEST_COMPLETED = 'REQUEST_COMPLETED',
  AGENT_NEARBY = 'AGENT_NEARBY',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  sentAt?: Date;
  createdAt: Date;
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  mediaUrl?: string;
  createdAt: Date;
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface RequestStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  rejected: number;
  avgResolutionTimeHours: number;
  byCategory: Record<RequestCategory, number>;
  byPriority: Record<RequestPriority, number>;
}

export interface AgentStats {
  agentId: string;
  agent: Partial<User>;
  totalAssigned: number;
  totalCompleted: number;
  avgRating: number;
  avgResolutionTimeHours: number;
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── API Response ───────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode: number;
}

// ─── Socket Events ──────────────────────────────────────────────────────────

export enum SocketEvent {
  REQUEST_CREATED = 'request:created',
  REQUEST_UPDATED = 'request:updated',
  REQUEST_ASSIGNED = 'request:assigned',
  AGENT_LOCATION = 'agent:location',
  CHAT_MESSAGE = 'chat:message',
  NOTIFICATION = 'notification:new',
}
