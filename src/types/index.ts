export type Role = 'OWNER' | 'EDITOR' | 'VIEWER';
export type DocFormat = 'MARKDOWN' | 'HTML';
export type PageRole = 'EDITOR' | 'VIEWER';

export interface Profile {
  id: string;
  email: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
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
  } | null;
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

export interface SharedPage {
  workspace: { id: string; name: string };
  page: { id: string; title: string; icon: string | null };
  role: PageRole;
  sharedBy: Profile | null;
  createdAt: string;
}

export type WorkspaceViewerRole = 'MEMBER' | 'GUEST';

export interface PageListResponse {
  pages: PageNode[];
  viewerRole: WorkspaceViewerRole;
  memberRole: Role | null;
}
