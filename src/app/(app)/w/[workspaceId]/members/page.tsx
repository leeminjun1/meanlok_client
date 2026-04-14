'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createInvite,
  listInvites,
  listMembers,
  removeMember,
  revokeInvite,
  updateMemberRole,
} from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import type { Role } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function MembersPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('VIEWER');

  const membersQuery = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => listMembers(workspaceId),
  });

  const invitesQuery = useQuery({
    queryKey: ['invites', workspaceId],
    queryFn: () => listInvites(workspaceId),
  });

  const inviteMutation = useMutation({
    mutationFn: () => createInvite(workspaceId, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      setInviteEmail('');
      void queryClient.invalidateQueries({ queryKey: ['invites', workspaceId] });
      toast.success('초대 메일을 생성했습니다.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const roleMutation = useMutation({
    mutationFn: (params: { memberId: string; role: Role }) =>
      updateMemberRole(workspaceId, params.memberId, params.role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
      toast.success('권한을 변경했습니다.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(workspaceId, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
      toast.success('멤버를 제거했습니다.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(workspaceId, inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invites', workspaceId] });
      toast.success('초대를 취소했습니다.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-neutral-900">멤버 관리</h2>
        <div className="space-y-2">
          {(membersQuery.data ?? []).map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-2"
            >
              <div>
                <p className="text-sm font-medium text-neutral-800">{member.user.email}</p>
                <p className="text-xs text-neutral-500">{member.user.name || member.user.id}</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(event) =>
                    roleMutation.mutate({
                      memberId: member.id,
                      role: event.target.value as Role,
                    })
                  }
                  className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
                >
                  <option value="OWNER">OWNER</option>
                  <option value="EDITOR">EDITOR</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeMutation.mutate(member.id)}
                >
                  제거
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-neutral-900">초대 관리</h2>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            className="max-w-sm"
            placeholder="invite@example.com"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
          />
          <select
            className="h-10 rounded-md border border-neutral-300 bg-white px-2 text-sm"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as Role)}
          >
            <option value="VIEWER">VIEWER</option>
            <option value="EDITOR">EDITOR</option>
            <option value="OWNER">OWNER</option>
          </select>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={!inviteEmail || inviteMutation.isPending}
          >
            초대 생성
          </Button>
        </div>

        <div className="space-y-2">
          {(invitesQuery.data ?? []).map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-2"
            >
              <div>
                <p className="text-sm text-neutral-800">{invite.email}</p>
                <p className="text-xs text-neutral-500">
                  {invite.role} / 만료: {new Date(invite.expiresAt).toLocaleString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => revokeMutation.mutate(invite.id)}
              >
                취소
              </Button>
            </div>
          ))}
          {invitesQuery.data?.length === 0 ? (
            <p className="text-sm text-neutral-500">활성 초대가 없습니다.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
