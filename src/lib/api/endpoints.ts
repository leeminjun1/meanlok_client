import { apiClient } from '@/lib/api/client';
import type {
  AiAskResponse,
  AiUsageSummary,
  AcceptPageInviteResponse,
  AcceptInviteResponse,
  AuthMeResponse,
  DocumentImageUploadResponse,
  DocumentDelta,
  DocFormat,
  InheritedShare,
  Invite,
  InvitePreview,
  LinkInviteMode,
  Member,
  PageAccessRequest,
  PageDetail,
  PageMeta,
  PageInvitePreview,
  PageInviteSummary,
  PageListResponse,
  PageRole,
  PageShare,
  OpsMetricsSnapshot,
  Role,
  SharedPage,
  Workspace,
} from '@/types';

interface OffsetPaginationResponse<T> {
  items: T[];
  nextOffset: number | null;
}

interface PaginatedPageListResponse extends PageListResponse {
  nextOffset: number | null;
}

const DEFAULT_PAGINATION_LIMIT = 120;
const MAX_PAGINATION_ROUNDS = 100;

async function collectOffsetPages<T>(
  fetchChunk: (offset: number) => Promise<OffsetPaginationResponse<T>>,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  let round = 0;

  while (round < MAX_PAGINATION_ROUNDS) {
    const chunk = await fetchChunk(offset);
    all.push(...chunk.items);

    if (chunk.nextOffset === null) {
      break;
    }

    offset = chunk.nextOffset;
    round += 1;
  }

  return all;
}

export function authMe() {
  return apiClient.get<AuthMeResponse>('/auth/me').then((res) => res.data);
}

export function listSharedPages() {
  return apiClient.get<SharedPage[]>('/auth/me/shared-pages').then((res) => res.data);
}

export function listWorkspaces() {
  return apiClient.get<Workspace[]>('/workspaces').then((res) => res.data);
}

export function createWorkspace(payload: { name: string }) {
  return apiClient
    .post<Workspace>('/workspaces', payload)
    .then((res) => res.data);
}

export function getWorkspace(id: string) {
  return apiClient.get<Workspace>(`/workspaces/${id}`).then((res) => res.data);
}

export function getWorkspacePublicInfo(id: string) {
  return apiClient
    .get<Pick<Workspace, 'id' | 'name'>>(`/workspaces/${id}/public-info`)
    .then((res) => res.data);
}

export function updateWorkspace(
  id: string,
  payload: { name?: string; linkInviteMode?: LinkInviteMode },
) {
  return apiClient
    .patch<Workspace>(`/workspaces/${id}`, payload)
    .then((res) => res.data);
}

export function deleteWorkspace(id: string) {
  return apiClient.delete(`/workspaces/${id}`).then((res) => res.data);
}

export function listMembers(workspaceId: string) {
  return collectOffsetPages<Member>((offset) =>
    apiClient
      .get<OffsetPaginationResponse<Member>>(`/workspaces/${workspaceId}/members`, {
        params: {
          limit: DEFAULT_PAGINATION_LIMIT,
          offset,
        },
      })
      .then((res) => res.data),
  );
}

export function updateMemberRole(
  workspaceId: string,
  memberId: string,
  role: Role,
) {
  return apiClient
    .patch<Member>(`/workspaces/${workspaceId}/members/${memberId}`, { role })
    .then((res) => res.data);
}

export function removeMember(workspaceId: string, memberId: string) {
  return apiClient
    .delete(`/workspaces/${workspaceId}/members/${memberId}`)
    .then((res) => res.data);
}

export function listInvites(workspaceId: string) {
  return collectOffsetPages<Invite>((offset) =>
    apiClient
      .get<OffsetPaginationResponse<Invite>>(`/workspaces/${workspaceId}/invites`, {
        params: {
          limit: DEFAULT_PAGINATION_LIMIT,
          offset,
        },
      })
      .then((res) => res.data),
  );
}

export function createInvite(
  workspaceId: string,
  payload: { email: string; role: Role },
) {
  return apiClient
    .post<Invite>(`/workspaces/${workspaceId}/invites`, payload)
    .then((res) => res.data);
}

export function revokeInvite(workspaceId: string, inviteId: string) {
  return apiClient
    .delete(`/workspaces/${workspaceId}/invites/${inviteId}`)
    .then((res) => res.data);
}

export function acceptInvite(payload: { token: string }) {
  return apiClient
    .post<AcceptInviteResponse>('/invites/accept', payload)
    .then((res) => res.data);
}

export function getInvitePreview(token: string) {
  return apiClient
    .get<InvitePreview>(`/invites/${token}/preview`)
    .then((res) => res.data);
}

export function listPages(workspaceId: string) {
  const fetchChunk = (offset: number) =>
    apiClient
      .get<PaginatedPageListResponse>(`/workspaces/${workspaceId}/pages`, {
        params: {
          limit: DEFAULT_PAGINATION_LIMIT,
          offset,
        },
      })
      .then((res) => res.data);

  return fetchChunk(0).then(async (first) => {
    const pages = [...first.pages];
    let nextOffset = first.nextOffset;
    let round = 0;

    while (nextOffset !== null && round < MAX_PAGINATION_ROUNDS) {
      const chunk = await fetchChunk(nextOffset);
      pages.push(...chunk.pages);
      nextOffset = chunk.nextOffset;
      round += 1;
    }

    return {
      pages,
      viewerRole: first.viewerRole,
      memberRole: first.memberRole,
    } satisfies PageListResponse;
  });
}

export function getPage(workspaceId: string, pageId: string) {
  return apiClient
    .get<PageDetail>(`/workspaces/${workspaceId}/pages/${pageId}`)
    .then((res) => res.data);
}

export function getPageMeta(workspaceId: string, pageId: string) {
  return apiClient
    .get<PageMeta>(`/workspaces/${workspaceId}/pages/${pageId}/meta`)
    .then((res) => res.data);
}

export function createPage(
  workspaceId: string,
  payload: { title: string; parentId?: string; icon?: string },
) {
  return apiClient
    .post<PageDetail>(`/workspaces/${workspaceId}/pages`, payload)
    .then((res) => res.data);
}

export function updatePage(
  workspaceId: string,
  pageId: string,
  patch: Partial<{
    title: string;
    icon: string | null;
    parentId: string | null;
    order: number;
  }>,
) {
  return apiClient
    .patch<PageDetail>(`/workspaces/${workspaceId}/pages/${pageId}`, patch)
    .then((res) => res.data);
}

export function deletePage(workspaceId: string, pageId: string) {
  return apiClient
    .delete(`/workspaces/${workspaceId}/pages/${pageId}`)
    .then((res) => res.data);
}

export function duplicatePage(
  workspaceId: string,
  pageId: string,
  payload: { targetWorkspaceId?: string; targetParentId?: string },
) {
  return apiClient
    .post<PageDetail>(`/workspaces/${workspaceId}/pages/${pageId}/duplicate`, payload)
    .then((res) => res.data);
}

export function movePage(
  workspaceId: string,
  pageId: string,
  payload: { targetWorkspaceId?: string; targetParentId?: string; order?: number },
) {
  return apiClient
    .post<PageDetail>(`/workspaces/${workspaceId}/pages/${pageId}/move`, payload)
    .then((res) => res.data);
}

export function upsertDocument(
  workspaceId: string,
  pageId: string,
  payload: {
    format: DocFormat;
    expectedVersion?: number;
    body?: string;
    delta?: DocumentDelta;
  },
) {
  return apiClient
    .put<PageDetail['document']>(
      `/workspaces/${workspaceId}/pages/${pageId}/document`,
      payload,
    )
    .then((res) => res.data);
}

export function uploadDocumentImage(
  workspaceId: string,
  pageId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient
    .post<DocumentImageUploadResponse>(
      `/workspaces/${workspaceId}/pages/${pageId}/document/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )
    .then((res) => res.data);
}

export function listPageShares(workspaceId: string, pageId: string) {
  return apiClient
    .get<{ direct: PageShare[]; inherited: InheritedShare[] }>(
      `/workspaces/${workspaceId}/pages/${pageId}/shares`,
    )
    .then((res) => res.data);
}

export function addPageShare(
  workspaceId: string,
  pageId: string,
  body: { userId?: string; email?: string; role: PageRole },
) {
  return apiClient
    .post<{ kind: 'share' | 'invite'; data: PageShare | PageInviteSummary }>(
      `/workspaces/${workspaceId}/pages/${pageId}/shares`,
      body,
    )
    .then((res) => res.data);
}

export function updatePageShare(
  workspaceId: string,
  pageId: string,
  shareId: string,
  payload: { role: PageRole },
) {
  return apiClient
    .patch<PageShare>(`/workspaces/${workspaceId}/pages/${pageId}/shares/${shareId}`, payload)
    .then((res) => res.data);
}

export function removePageShare(
  workspaceId: string,
  pageId: string,
  shareId: string,
) {
  return apiClient
    .delete(`/workspaces/${workspaceId}/pages/${pageId}/shares/${shareId}`)
    .then((res) => res.data);
}

export function listPageInvites(workspaceId: string, pageId: string) {
  return collectOffsetPages<PageInviteSummary>((offset) =>
    apiClient
      .get<OffsetPaginationResponse<PageInviteSummary>>(
        `/workspaces/${workspaceId}/pages/${pageId}/invites`,
        {
          params: {
            limit: DEFAULT_PAGINATION_LIMIT,
            offset,
          },
        },
      )
      .then((res) => res.data),
  );
}

export function revokePageInvite(
  workspaceId: string,
  pageId: string,
  inviteId: string,
) {
  return apiClient
    .delete(`/workspaces/${workspaceId}/pages/${pageId}/invites/${inviteId}`)
    .then((res) => res.data);
}

export function acceptPageInvite(payload: { token: string }) {
  return apiClient
    .post<AcceptPageInviteResponse>('/page-invites/accept', payload)
    .then((res) => res.data);
}

export function getPageInvitePreview(token: string) {
  return apiClient
    .get<PageInvitePreview>(`/page-invites/${token}/preview`)
    .then((res) => res.data);
}

export function listPageAccessRequests(workspaceId: string, pageId: string) {
  return collectOffsetPages<PageAccessRequest>((offset) =>
    apiClient
      .get<OffsetPaginationResponse<PageAccessRequest>>(
        `/workspaces/${workspaceId}/pages/${pageId}/access-requests`,
        {
          params: {
            limit: DEFAULT_PAGINATION_LIMIT,
            offset,
          },
        },
      )
      .then((res) => res.data),
  );
}

export function handlePageAccessRequest(
  workspaceId: string,
  pageId: string,
  requestId: string,
  action: 'APPROVE' | 'REJECT',
) {
  return apiClient
    .patch<{ ok: true }>(
      `/workspaces/${workspaceId}/pages/${pageId}/access-requests/${requestId}`,
      { action },
    )
    .then((res) => res.data);
}

export function getAiUsage() {
  return apiClient.get<AiUsageSummary>('/ai/usage').then((res) => res.data);
}

export function aiAsk(
  payload: { question: string },
  options?: { signal?: AbortSignal },
) {
  return apiClient
    .post<AiAskResponse>('/ai/ask', payload, { signal: options?.signal })
    .then((res) => res.data);
}

export function getOpsMetrics() {
  return apiClient.get<OpsMetricsSnapshot>('/ops/metrics').then((res) => res.data);
}
