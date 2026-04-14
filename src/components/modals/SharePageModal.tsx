'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addPageShare,
  handlePageAccessRequest,
  listPageAccessRequests,
  listPageInvites,
  listPageShares,
  removePageShare,
  revokePageInvite,
  updatePageShare,
} from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import type {
  PageAccessRequest,
  PageInviteSummary,
  PageRole,
  PageShare,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface SharePageModalProps {
  workspaceId: string;
  pageId: string;
  pageTitle: string;
  open: boolean;
  onClose: () => void;
}

function inviteLink(token: string) {
  if (typeof window === 'undefined') {
    return `http://localhost:3000/page-invites/${token}`;
  }

  return `${window.location.origin}/page-invites/${token}`;
}

function isLinkOnlyInviteEmail(email: string) {
  return email.startsWith('link-') && email.endsWith('@share.meanlok.local');
}

export function SharePageModal({
  workspaceId,
  pageId,
  pageTitle,
  open,
  onClose,
}: SharePageModalProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PageRole>('VIEWER');
  const [latestInviteToken, setLatestInviteToken] = useState<string | null>(null);

  const sharesQuery = useQuery({
    queryKey: ['page-shares', workspaceId, pageId],
    queryFn: () => listPageShares(workspaceId, pageId),
    enabled: open,
  });

  const invitesQuery = useQuery({
    queryKey: ['page-invites', workspaceId, pageId],
    queryFn: () => listPageInvites(workspaceId, pageId),
    enabled: open,
  });

  const accessRequestsQuery = useQuery({
    queryKey: ['page-access-requests', workspaceId, pageId],
    queryFn: () => listPageAccessRequests(workspaceId, pageId),
    enabled: open,
  });

  const invalidateShareQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: ['page-shares', workspaceId, pageId],
    });
    void queryClient.invalidateQueries({
      queryKey: ['page-invites', workspaceId, pageId],
    });
    void queryClient.invalidateQueries({
      queryKey: ['page-access-requests', workspaceId, pageId],
    });
    void queryClient.invalidateQueries({
      queryKey: ['pages', workspaceId],
    });
    void queryClient.invalidateQueries({
      queryKey: ['shared-pages'],
    });
  };

  const addMutation = useMutation({
    mutationFn: () => addPageShare(workspaceId, pageId, { email, role }),
    onSuccess: (result) => {
      setEmail('');
      invalidateShareQueries();

      if (result.kind === 'invite') {
        const invite = result.data as PageInviteSummary;
        setLatestInviteToken(invite.token);
        toast.success(
          '초대 링크가 발송되었습니다 — 실제 메일 발송은 TODO, 대시보드에서 링크 확인',
        );
        return;
      }

      setLatestInviteToken(null);
      toast.success('페이지 공유 대상을 추가했습니다.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const createLinkMutation = useMutation({
    mutationFn: () => addPageShare(workspaceId, pageId, { role }),
    onSuccess: (result) => {
      invalidateShareQueries();

      if (result.kind === 'invite') {
        const invite = result.data as PageInviteSummary;
        setLatestInviteToken(invite.token);
        toast.success('링크 초대를 생성했습니다.');
        return;
      }

      toast.success('페이지 공유 대상을 추가했습니다.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: (params: { shareId: string; role: PageRole }) =>
      updatePageShare(workspaceId, pageId, params.shareId, { role: params.role }),
    onSuccess: () => {
      invalidateShareQueries();
      toast.success('권한을 변경했습니다.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (shareId: string) => removePageShare(workspaceId, pageId, shareId),
    onSuccess: () => {
      invalidateShareQueries();
      toast.success('공유를 해제했습니다.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) => revokePageInvite(workspaceId, pageId, inviteId),
    onSuccess: () => {
      invalidateShareQueries();
      toast.success('초대를 취소했습니다.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const handleAccessRequestMutation = useMutation({
    mutationFn: (params: { requestId: string; action: 'APPROVE' | 'REJECT' }) =>
      handlePageAccessRequest(workspaceId, pageId, params.requestId, params.action),
    onSuccess: (_data, variables) => {
      invalidateShareQueries();
      toast.success(
        variables.action === 'APPROVE'
          ? '권한 요청을 승인했습니다.'
          : '권한 요청을 거절했습니다.',
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const latestInviteUrl = useMemo(
    () => (latestInviteToken ? inviteLink(latestInviteToken) : null),
    [latestInviteToken],
  );

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('링크를 복사했습니다.');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`페이지 공유 · ${pageTitle}`}
      className="max-w-2xl"
      footer={
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
      }
    >
      <div className="space-y-5 text-sm">
        <section className="rounded-md border border-neutral-200 p-3">
          <p className="mb-2 font-medium text-neutral-800">사용자 추가</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="email@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-w-[220px] flex-1"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as PageRole)}
              className="h-10 rounded-md border border-neutral-300 bg-white px-2"
            >
              <option value="VIEWER">VIEWER</option>
              <option value="EDITOR">EDITOR</option>
            </select>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!email.trim() || addMutation.isPending}
            >
              공유
            </Button>
            <Button
              variant="outline"
              onClick={() => createLinkMutation.mutate()}
              disabled={createLinkMutation.isPending}
            >
              링크 생성
            </Button>
          </div>

          {latestInviteUrl ? (
            <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-2">
              <p className="text-xs text-neutral-600">생성된 초대 링크</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate text-xs text-neutral-700">
                  {latestInviteUrl}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyText(latestInviteUrl)}>
                  복사
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <p className="mb-2 font-medium text-neutral-800">직접 공유</p>
          <div className="space-y-2">
            {(sharesQuery.data?.direct ?? []).map((share: PageShare) => (
              <div
                key={share.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-2"
              >
                <div>
                  <p className="text-neutral-800">{share.user.name || share.user.email}</p>
                  <p className="text-xs text-neutral-500">{share.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
                    value={share.role}
                    onChange={(event) =>
                      updateMutation.mutate({
                        shareId: share.id,
                        role: event.target.value as PageRole,
                      })
                    }
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="EDITOR">EDITOR</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeMutation.mutate(share.id)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            ))}
            {(sharesQuery.data?.direct?.length ?? 0) === 0 ? (
              <p className="text-xs text-neutral-500">직접 공유된 사용자가 없습니다.</p>
            ) : null}
          </div>
        </section>

        <section>
          <p className="mb-2 font-medium text-neutral-800">상속된 공유</p>
          <div className="space-y-2">
            {(sharesQuery.data?.inherited ?? []).map((share) => (
              <div
                key={`${share.user.id}-${share.sourcePage.id}`}
                className="rounded-md border border-neutral-200 bg-neutral-50 p-2"
              >
                <p className="text-neutral-800">
                  {share.user.name || share.user.email} ({share.role})
                </p>
                <p className="text-xs text-neutral-500">
                  {share.sourcePage.title}에서 상속
                </p>
              </div>
            ))}
            {(sharesQuery.data?.inherited?.length ?? 0) === 0 ? (
              <p className="text-xs text-neutral-500">상속된 공유가 없습니다.</p>
            ) : null}
          </div>
        </section>

        <section>
          <p className="mb-2 font-medium text-neutral-800">권한 요청</p>
          <div className="space-y-2">
            {(accessRequestsQuery.data ?? []).map((request: PageAccessRequest) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-2"
              >
                <div>
                  <p className="text-neutral-800">{request.user.name || request.user.email}</p>
                  <p className="text-xs text-neutral-500">
                    {request.user.email} / 요청 권한: {request.role} / 요청 시각:{' '}
                    {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleAccessRequestMutation.mutate({
                        requestId: request.id,
                        action: 'REJECT',
                      })
                    }
                    disabled={handleAccessRequestMutation.isPending}
                  >
                    거절
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleAccessRequestMutation.mutate({
                        requestId: request.id,
                        action: 'APPROVE',
                      })
                    }
                    disabled={handleAccessRequestMutation.isPending}
                  >
                    승인
                  </Button>
                </div>
              </div>
            ))}
            {(accessRequestsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-xs text-neutral-500">대기 중인 권한 요청이 없습니다.</p>
            ) : null}
          </div>
        </section>

        <section>
          <p className="mb-2 font-medium text-neutral-800">대기 중 초대</p>
          <div className="space-y-2">
            {(invitesQuery.data ?? []).map((invite) => {
              const url = inviteLink(invite.token);
              return (
                <div
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-2"
                >
                  <div>
                    <p className="text-neutral-800">
                      {isLinkOnlyInviteEmail(invite.email) ? '링크 전용 초대' : invite.email}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {invite.role} / 만료: {new Date(invite.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyText(url)}>
                      링크 복사
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revokeInviteMutation.mutate(invite.id)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              );
            })}
            {(invitesQuery.data?.length ?? 0) === 0 ? (
              <p className="text-xs text-neutral-500">대기 중인 초대가 없습니다.</p>
            ) : null}
          </div>
        </section>
      </div>
    </Modal>
  );
}
