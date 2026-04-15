export type Role = 'OWNER' | 'EDITOR' | 'VIEWER';
export type DocFormat = 'MARKDOWN' | 'HTML';
export type PageRole = 'EDITOR' | 'VIEWER';
export type LinkInviteMode = 'OPEN' | 'REQUEST';
export type PageAccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Profile {
  id: string;
  email: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  linkInviteMode: LinkInviteMode;
  createdAt: string;
}

export interface Member {
  id: string;
  userId: string;
  workspaceId: string;
  role: Role;
  user: Profile;
}

export interface PageNode {
  id: string;
  title: string;
  icon?: string | null;
  parentId: string | null;
  order: number;
}

export interface PageDetail extends PageNode {
  workspaceId: string;
  accessRole: PageRole;
  document?: {
    body: string;
    format: DocFormat;
    version: number;
  } | null;
}

export interface DocumentDelta {
  start: number;
  deleteCount: number;
  insertText: string;
}

export interface PageMeta {
  id: string;
  workspaceId: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  accessRole: PageRole;
}

export interface Invite {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface AuthMeResponse {
  profile: Profile;
}

export interface AcceptInviteResponse {
  workspaceId: string;
}

export interface InvitePreview {
  workspaceId: string;
  workspaceName: string;
  role: Role;
}

export interface PageShare {
  id: string;
  role: PageRole;
  user: Profile;
  createdAt: string;
}

export interface InheritedShare {
  role: PageRole;
  user: Profile;
  sourcePage: { id: string; title: string };
  createdAt: string;
}

export interface PageInviteSummary {
  id: string;
  email: string;
  role: PageRole;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  inviter: Profile;
}

export interface PageInvitePreview {
  pageId: string;
  pageTitle: string;
  workspaceId: string;
  workspaceName: string;
  role: PageRole;
  linkInviteMode: LinkInviteMode;
}

export interface PageAccessRequest {
  id: string;
  role: PageRole;
  status: PageAccessRequestStatus;
  createdAt: string;
  user: Profile;
}

export interface SharedPage {
  workspace: { id: string; name: string };
  page: { id: string; title: string; icon: string | null };
  role: PageRole;
  sharedBy: Profile | null;
  createdAt: string;
}

export interface AcceptPageInviteResponse {
  workspaceId: string;
  pageId: string;
  status: 'granted' | 'requested';
  requestId?: string;
}

export type AiErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'INPUT_TOO_LONG'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'SERVER_ERROR'
  | 'AI_PROVIDER_AUTH_FAILED'
  | 'REQUEST_CANCELED';

export interface AiUsageSummary {
  usedToday: number;
  dailyLimit: number;
  remainingToday: number;
  resetAt: string;
}

export interface AiAskResponse {
  result: string;
  usage: AiUsageSummary;
}

export type WorkspaceViewerRole = 'MEMBER' | 'GUEST';

export interface PageListResponse {
  pages: PageNode[];
  viewerRole: WorkspaceViewerRole;
  memberRole: Role | null;
}

export interface OpsRouteMetric {
  route: string;
  count: number;
  p95Ms: number;
  errorRatePct: number;
}

export interface OpsErrorMetric {
  code: string;
  count: number;
}

export interface OpsMetricsSnapshot {
  generatedAt: string;
  windowMinutes: number;
  uptimeSec: number;
  http: {
    total: number;
    p95Ms: number;
    routes: OpsRouteMetric[];
  };
  documentSaves: {
    total: number;
    failed: number;
    failureRatePct: number;
    p95Ms: number;
  };
  ai: {
    total: number;
    failed: number;
    errorRatePct: number;
    p95Ms: number;
    errorsByCode: OpsErrorMetric[];
  };
}

export interface DocumentImageUploadResponse {
  url: string;
  ref?: string;
  path: string;
  bucket: string;
  contentType: string;
  size: number;
}
