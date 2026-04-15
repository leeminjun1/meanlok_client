'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updatePage } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface RenamePageModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  pageId: string;
  currentTitle: string;
}

export function RenamePageModal({
  open,
  onClose,
  workspaceId,
  pageId,
  currentTitle,
}: RenamePageModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(currentTitle);

  const mutation = useMutation({
    mutationFn: () => updatePage(workspaceId, pageId, { title: title.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pages', workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['page', workspaceId, pageId] });
      void queryClient.invalidateQueries({ queryKey: ['page-meta', workspaceId, pageId] });
      toast.success('페이지 이름을 바꿨습니다.');
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
      title="이름 바꾸기"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
          >
            저장
          </Button>
        </>
      }
    >
      <Input value={title} onChange={(event) => setTitle(event.target.value)} />
    </Modal>
  );
}
