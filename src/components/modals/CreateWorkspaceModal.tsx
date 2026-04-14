'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createWorkspace } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({
  open,
  onClose,
}: CreateWorkspaceModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const mutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: (workspace) => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('워크스페이스를 만들었습니다.');
      setName('');
      onClose();
      router.push(`/w/${workspace.id}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="새 워크스페이스"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={() => mutation.mutate({ name: name.trim() })}
            disabled={!name.trim() || mutation.isPending}
          >
            생성
          </Button>
        </>
      }
    >
      <label className="space-y-2 text-sm text-neutral-700">
        <span>이름</span>
        <Input
          placeholder="예: Team Workspace"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
    </Modal>
  );
}
