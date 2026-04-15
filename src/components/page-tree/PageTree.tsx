'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Modal } from '@/components/ui/Modal';
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

interface FlatTreeRow {
  node: TreeNodeData;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

const TREE_ROW_HEIGHT = 34;
const TREE_OVERSCAN_ROWS = 8;

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

function findPathToNode(nodes: TreeNodeData[], targetId: string): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return [node.id];
    }

    const childPath = findPathToNode(node.children, targetId);
    if (childPath) {
      return [node.id, ...childPath];
    }
  }

  return null;
}

function flattenVisibleRows(
  nodes: TreeNodeData[],
  expanded: Record<string, boolean>,
  depth = 0,
  rows: FlatTreeRow[] = [],
) {
  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded[node.id] ?? depth === 0;
    rows.push({
      node,
      depth,
      hasChildren,
      isExpanded,
    });

    if (hasChildren && isExpanded) {
      flattenVisibleRows(node.children, expanded, depth + 1, rows);
    }
  }

  return rows;
}

export function PageTree({ workspaceId }: PageTreeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renameTarget, setRenameTarget] = useState<PageNode | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<PageNode | null>(null);
  const [moveTarget, setMoveTarget] = useState<PageNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PageNode | null>(null);
  const treeViewportRef = useRef<HTMLDivElement | null>(null);
  const [treeScrollTop, setTreeScrollTop] = useState(0);
  const [treeViewportHeight, setTreeViewportHeight] = useState(360);

  const pagesQuery = useQuery({
    queryKey: ['pages', workspaceId],
    queryFn: () => listPages(workspaceId),
    staleTime: 60 * 1000,
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
    [pagesQuery.data?.pages],
  );
  const flatRows = useMemo(() => flattenVisibleRows(tree, expanded), [tree, expanded]);

  useEffect(() => {
    const match = pathname.match(/\/p\/([^/?#]+)/);
    const activePageId = match?.[1];

    if (!activePageId) {
      return;
    }

    const pathIds = findPathToNode(tree, activePageId);
    if (!pathIds) {
      return;
    }

    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const id of pathIds) {
        if (!(id in next)) {
          next[id] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [pathname, tree]);

  useEffect(() => {
    const viewport = treeViewportRef.current;
    if (!viewport) {
      return;
    }

    const handleScroll = () => {
      setTreeScrollTop(viewport.scrollTop);
    };
    const handleResize = () => {
      setTreeViewportHeight(viewport.clientHeight);
    };

    handleResize();
    viewport.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new ResizeObserver(handleResize);
    observer.observe(viewport);

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const totalRowCount = flatRows.length;
  const totalHeight = totalRowCount * TREE_ROW_HEIGHT;
  const startIndex = Math.max(
    0,
    Math.floor(treeScrollTop / TREE_ROW_HEIGHT) - TREE_OVERSCAN_ROWS,
  );
  const endIndex = Math.min(
    totalRowCount,
    Math.ceil((treeScrollTop + treeViewportHeight) / TREE_ROW_HEIGHT) +
      TREE_OVERSCAN_ROWS,
  );
  const visibleRows = flatRows.slice(startIndex, endIndex);

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
    setDeleteTarget(node);
  };

  const onConfirmDelete = () => {
    if (!deleteTarget || deleteMutation.isPending) {
      return;
    }

    const targetId = deleteTarget.id;
    setDeleteTarget(null);
    deleteMutation.mutate(targetId);
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
        ) : flatRows.length ? (
          <div
            ref={treeViewportRef}
            className="max-h-[calc(100vh-220px)] overflow-y-auto"
          >
            <div className="relative" style={{ height: `${totalHeight}px` }}>
              {visibleRows.map((row, offset) => {
                const index = startIndex + offset;
                const href = `/w/${workspaceId}/p/${row.node.id}`;
                const isActive = pathname === href;

                return (
                  <div
                    key={row.node.id}
                    className="absolute left-0 right-0"
                    style={{
                      top: `${index * TREE_ROW_HEIGHT}px`,
                      height: `${TREE_ROW_HEIGHT}px`,
                    }}
                  >
                    <div
                      className="group flex h-full items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-100"
                      style={{ paddingLeft: `${8 + row.depth * 14}px` }}
                    >
                      <button
                        type="button"
                        className="h-5 w-5 rounded text-neutral-500 hover:bg-neutral-200"
                        onClick={() => row.hasChildren && toggle(row.node.id)}
                      >
                        {row.hasChildren ? (
                          row.isExpanded ? (
                            <ChevronDown className="mx-auto h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="mx-auto h-3.5 w-3.5" />
                          )
                        ) : null}
                      </button>

                      <Link
                        href={href}
                        className={`min-w-0 flex-1 truncate text-sm ${
                          isActive ? 'font-medium text-neutral-900' : 'text-neutral-700'
                        }`}
                      >
                        {row.node.icon ? `${row.node.icon} ` : ''}
                        {row.node.title}
                      </Link>

                      <button
                        type="button"
                        onClick={() => onCreateChild(row.node.id)}
                        className="invisible rounded p-1 text-neutral-500 hover:bg-neutral-200 group-hover:visible"
                        aria-label="하위 페이지 생성"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>

                      <div className="invisible group-hover:visible">
                        <DropdownMenu
                          trigger={<Ellipsis className="h-3.5 w-3.5 text-neutral-500" />}
                          items={[
                            { label: '이름 바꾸기', onClick: () => setRenameTarget(row.node) },
                            { label: '복제', onClick: () => setDuplicateTarget(row.node) },
                            { label: '이동', onClick: () => setMoveTarget(row.node) },
                            {
                              label: '삭제',
                              onClick: () => onDelete(row.node),
                              className: 'text-red-600 hover:bg-red-50',
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (deleteMutation.isPending) {
            return;
          }
          setDeleteTarget(null);
        }}
        title="페이지 삭제"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              취소
            </Button>
            <Button
              onClick={onConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              삭제
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-700">
          {deleteTarget
            ? `'${deleteTarget.title}' 페이지를 삭제할까요?`
            : '페이지를 삭제할까요?'}
        </p>
      </Modal>
    </aside>
  );
}
