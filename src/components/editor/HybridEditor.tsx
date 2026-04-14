'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getPage, upsertDocument } from '@/lib/api/endpoints';
import type { DocFormat } from '@/types';
import { MarkdownView } from '@/components/editor/MarkdownView';
import { RichEditor } from '@/components/editor/RichEditor';
import { Skeleton } from '@/components/ui/Skeleton';
import { convertBody } from '@/lib/editor/format-convert';
import { cn } from '@/lib/utils';

type EditorTab = 'rich' | 'markdown' | 'preview';
type SaveState = 'idle' | 'saving' | 'saved';

interface HybridEditorProps {
  workspaceId: string;
  pageId: string;
}

interface HybridEditorContentProps {
  workspaceId: string;
  pageId: string;
  initialBody: string;
  initialFormat: DocFormat;
  readOnly: boolean;
}

function HybridEditorContent({
  workspaceId,
  pageId,
  initialBody,
  initialFormat,
  readOnly,
}: HybridEditorContentProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('rich');
  const [format, setFormat] = useState<DocFormat>(initialFormat);
  const [body, setBody] = useState(initialBody);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const initializedRef = useRef(false);

  const saveMutation = useMutation({
    mutationFn: (payload: { body: string; format: DocFormat }) =>
      upsertDocument(workspaceId, pageId, payload),
    onSuccess: () => {
      setSaveState('saved');
    },
  });
  const mutate = saveMutation.mutate;

  useEffect(() => {
    if (readOnly) {
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      mutate({ body, format });
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [body, format, mutate, readOnly]);

  const onChangeBody = (next: string) => {
    if (readOnly) {
      return;
    }

    setBody(next);
    setSaveState('saving');
  };

  const onChangeFormat = (next: DocFormat) => {
    if (readOnly) {
      return;
    }

    if (next === format) {
      return;
    }

    const converted = convertBody(body, format, next);
    setFormat(next);
    setBody(converted);
    setSaveState('saving');
  };

  const saveLabel = readOnly
    ? '읽기 전용'
    : saveMutation.isPending || saveState === 'saving'
      ? '저장 중...'
      : saveState === 'saved'
        ? '저장됨'
        : '초기 상태';

  return (
    <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-1">
          {(
            [
              ['rich', '편집 (Rich)'],
              ['markdown', 'Markdown 소스'],
              ['preview', '미리보기'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'rounded px-3 py-1.5 text-sm',
                activeTab === id
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-800',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <select
            className="h-9 rounded-md border border-neutral-300 bg-white px-2"
            value={format}
            onChange={(event) => onChangeFormat(event.target.value as DocFormat)}
            disabled={readOnly}
          >
            <option value="MARKDOWN">Markdown</option>
            <option value="HTML">HTML</option>
          </select>
          <span className={cn('text-neutral-500', readOnly && 'font-medium text-neutral-700')}>
            {saveLabel}
          </span>
        </div>
      </div>

      {activeTab === 'rich' ? (
        format === 'MARKDOWN' ? (
          <textarea
            className="min-h-[320px] w-full rounded-md border border-neutral-300 p-3 font-mono text-sm"
            value={body}
            onChange={(event) => onChangeBody(event.target.value)}
            placeholder="Markdown으로 작성하세요."
            readOnly={readOnly}
          />
        ) : (
          <RichEditor value={body} onChange={onChangeBody} editable={!readOnly} />
        )
      ) : null}

      {activeTab === 'markdown' ? (
        <textarea
          className="min-h-[320px] w-full rounded-md border border-neutral-300 p-3 font-mono text-sm"
          value={body}
          onChange={(event) => onChangeBody(event.target.value)}
          placeholder="소스를 편집하세요."
          readOnly={readOnly}
        />
      ) : null}

      {activeTab === 'preview' ? (
        <div className="min-h-[320px] rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <MarkdownView body={body} />
        </div>
      ) : null}
    </section>
  );
}

export function HybridEditor({ workspaceId, pageId }: HybridEditorProps) {
  const pageQuery = useQuery({
    queryKey: ['page', workspaceId, pageId],
    queryFn: () => getPage(workspaceId, pageId),
  });

  if (pageQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const initialBody = pageQuery.data?.document?.body ?? '';
  const rawFormat = pageQuery.data?.document?.format;
  const initialFormat: DocFormat = rawFormat === 'HTML' ? 'HTML' : 'MARKDOWN';
  const readOnly = pageQuery.data?.accessRole !== 'EDITOR';

  return (
    <HybridEditorContent
      key={`${workspaceId}-${pageId}`}
      workspaceId={workspaceId}
      pageId={pageId}
      initialBody={initialBody}
      initialFormat={initialFormat}
      readOnly={readOnly}
    />
  );
}
