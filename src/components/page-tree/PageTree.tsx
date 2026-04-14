'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  Ellipsis,
  FilePlus,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createPage,
  deletePage,
  listPages,
} from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import type { PageNode } from '@/types';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { DuplicatePageModal } from '@/components/modals/DuplicatePageModal';
import { MovePageModal } from '@/components/modals/MovePageModal';
import { RenamePageModal } from '@/components/modals/RenamePageModal';

interface PageTreeProps {
  workspaceId: string;
}

interface TreeNodeData extends PageNode {
  children: TreeNodeData[];
}

function buildTree(nodes: PageNode[]): TreeNodeData[] {
  const map = new Map<string, TreeNodeData>();

  nodes.forEach((node) => {
    map.set(node.id, {
      ...node,
      children: [],
    });
  });

  const roots: TreeNodeData[] = [];

  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  const sortRecursive = (items: TreeNodeData[]) => {
    items.sort((a, b) => a.order - b.order);
    items.forEach((item) => sortRecursive(item.children));
  };

  sortRecursive(roots);
  return roots;
}

interface TreeNodeProps {
  workspaceId: string;
  node: TreeNodeData;
  depth: number;
  pathname: string;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onRename: (node: PageNode) => void;
  onDuplicate: (node: PageNode) => void;
  onMove: (node: PageNode) => void;
  onDelete: (node: PageNode) => void;
}

function TreeNode({
  workspaceId,
  node,
  depth,
  pathname,
  expanded,
  onToggle,
  onCreateChild,
  onRename,
  onDuplicate,
  onMove,
  onDelete,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded[node.id] ?? true;
  const href = `/w/${workspaceId}/p/${node.id}`;
  const isActive = pathname === href;

  return (
    <li>
      <div
        className="group flex items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-100"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          type="button"
          className="h-5 w-5 rounded text-neutral-500 hover:bg-neutral-200"
          onClick={() => hasChildren && onToggle(node.id)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="mx-auto h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="mx-auto h-3.5 w-3.5" />
            )
          ) : null}
        </button>

        <Link
          href={href}
          className={`min-w-0 flex-1 truncate text-sm ${
            isActive ? 'text-neutral-900 font-medium' : 'text-neutral-700'
          }`}
        >
          {node.icon ? `${node.icon} ` : ''}
          {node.title}
        </Link>

        <button
          type="button"
          onClick={() => onCreateChild(node.id)}
          className="invisible rounded p-1 text-neutral-500 hover:bg-neutral-200 group-hover:visible"
          aria-label="하위 페이지 생성"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <div className="invisible group-hover:visible">
          <DropdownMenu
            trigger={<Ellipsis className="h-3.5 w-3.5 text-neutral-500" />}
            items={[
              { label: '이름 바꾸기', onClick: () => onRename(node) },
              { label: '복제', onClick: () => onDuplicate(node) },
              { label: '이동', onClick: () => onMove(node) },
              {
                label: '삭제',
                onClick: () => onDelete(node),
                className: 'text-red-600 hover:bg-red-50',
              },
            ]}
          />
        </div>
      </div>

      {hasChildren && isExpanded ? (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              workspaceId={workspaceId}
              node={child}
              depth={depth + 1}
              pathname={pathname}
              expanded={expanded}
              onToggle={onToggle}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function PageTree({ workspaceId }: PageTreeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renameTarget, setRenameTarget] = useState<PageNode | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<PageNode | null>(null);
  const [moveTarget, setMoveTarget] = useState<PageNode | null>(null);

  const pagesQuery = useQuery({
    queryKey: ['pages', workspaceId],
    queryFn: () => listPages(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; parentId?: string }) =>
      createPage(workspaceId, payload),
    onSuccess: (page) => {
      void queryClient.invalidateQueries({ queryKey: ['pages', workspaceId] });
      toast.success('페이지를 만들었습니다.');
      router.push(`/w/${workspaceId}/p/${page.id}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (pageId: string) => deletePage(workspaceId, pageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pages', workspaceId] });
      toast.success('페이지를 삭제했습니다.');
      router.push(`/w/${workspaceId}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const tree = useMemo(
    () => buildTree(pagesQuery.data?.pages ?? []),
    [pagesQuery.data],
  );

  const canCreateRoot =
    pagesQuery.data?.viewerRole === 'MEMBER' &&
    pagesQuery.data.memberRole !== 'VIEWER';

  const toggle = (id: string) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? true),
    }));
  };

  const onCreateRoot = () => {
    createMutation.mutate({ title: '새 페이지' });
  };

  const onCreateChild = (parentId: string) => {
    createMutation.mutate({ title: '새 페이지', parentId });
    setExpanded((prev) => ({
      ...prev,
      [parentId]: true,
    }));
  };

  const onDelete = (node: PageNode) => {
    if (!window.confirm(`'${node.title}' 페이지를 삭제할까요?`)) {
      return;
    }

    deleteMutation.mutate(node.id);
  };

  return (
    <aside className="h-full overflow-y-auto bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-neutral-800">페이지</h2>
        {canCreateRoot ? (
          <Button size="sm" variant="ghost" onClick={onCreateRoot}>
            <FilePlus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="p-2">
        {pagesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : tree.length ? (
          <ul className="space-y-0.5">
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                workspaceId={workspaceId}
                node={node}
                depth={0}
                pathname={pathname}
                expanded={expanded}
                onToggle={toggle}
                onCreateChild={onCreateChild}
                onRename={setRenameTarget}
                onDuplicate={setDuplicateTarget}
                onMove={setMoveTarget}
                onDelete={onDelete}
              />
            ))}
          </ul>
        ) : (
          <p className="px-2 py-3 text-sm text-neutral-500">
            페이지가 없습니다. 상단 + 버튼으로 추가하세요.
          </p>
        )}
      </div>

      {renameTarget ? (
        <RenamePageModal
          open={Boolean(renameTarget)}
          onClose={() => setRenameTarget(null)}
          workspaceId={workspaceId}
          pageId={renameTarget.id}
          currentTitle={renameTarget.title}
        />
      ) : null}

      {duplicateTarget ? (
        <DuplicatePageModal
          open={Boolean(duplicateTarget)}
          onClose={() => setDuplicateTarget(null)}
          workspaceId={workspaceId}
          pageId={duplicateTarget.id}
        />
      ) : null}

      {moveTarget ? (
        <MovePageModal
          open={Boolean(moveTarget)}
          onClose={() => setMoveTarget(null)}
          workspaceId={workspaceId}
          pageId={moveTarget.id}
        />
      ) : null}
    </aside>
  );
}
