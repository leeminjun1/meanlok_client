'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listPages, listWorkspaces, movePage } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface MovePageModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  pageId: string;
}

export function MovePageModal({
  open,
  onClose,
  workspaceId,
  pageId,
}: MovePageModalProps) {
  const queryClient = useQueryClient();
  const [targetWorkspaceId, setTargetWorkspaceId] = useState(workspaceId);
  const [targetParentId, setTargetParentId] = useState('');

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
    enabled: open,
  });

  const pagesQuery = useQuery({
    queryKey: ['pages', targetWorkspaceId],
    queryFn: () => listPages(targetWorkspaceId),
    enabled: open && Boolean(targetWorkspaceId),
  });

  const workspaceOptions = useMemo(
    () => workspacesQuery.data ?? [],
    [workspacesQuery.data],
  );

  const mutation = useMutation({
    mutationFn: () =>
      movePage(workspaceId, pageId, {
        targetWorkspaceId,
        targetParentId: targetParentId || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pages', workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['pages', targetWorkspaceId] });
      toast.success('페이지를 이동했습니다.');
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="페이지 이동"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            이동
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <label className="block space-y-1">
          <span className="text-neutral-700">대상 워크스페이스</span>
          <select
            className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3"
            value={targetWorkspaceId}
            onChange={(event) => {
              setTargetWorkspaceId(event.target.value);
              setTargetParentId('');
            }}
          >
            {workspaceOptions.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-neutral-700">대상 부모 페이지 (선택)</span>
          <select
            className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3"
            value={targetParentId}
            onChange={(event) => setTargetParentId(event.target.value)}
          >
            <option value="">루트</option>
            {(pagesQuery.data?.pages ?? []).map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  );
}
