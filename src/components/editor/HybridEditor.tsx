'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getPage, upsertDocument } from '@/lib/api/endpoints';
import type { DocFormat } from '@/types';
import { MarkdownView } from '@/components/editor/MarkdownView';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { convertBody } from '@/lib/editor/format-convert';
import { sanitizeHtml } from '@/lib/sanitize';
import { cn } from '@/lib/utils';

type EditorTab = 'rich' | 'markdown' | 'preview';
type EditorMode = 'view' | 'edit';
type SaveState = 'idle' | 'saving' | 'saved';
type Draft = { body: string; format: DocFormat };

interface HybridEditorProps {
  workspaceId: string;
  pageId: string;
  mode?: EditorMode;
}

interface HybridEditorContentProps {
  workspaceId: string;
  pageId: string;
  initialBody: string;
  initialFormat: DocFormat;
  readOnly: boolean;
  mode: EditorMode;
}

function DocumentPreview({ body, format }: { body: string; format: DocFormat }) {
  if (format === 'HTML') {
    const clean = sanitizeHtml(body);
    return (
      <div
        className="prose prose-sm max-w-none text-neutral-800"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return <MarkdownView body={body} />;
}

function HybridEditorContent({
  workspaceId,
  pageId,
  initialBody,
  initialFormat,
  readOnly,
  mode,
}: HybridEditorContentProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('rich');
  const [format, setFormat] = useState<DocFormat>(initialFormat);
  const [body, setBody] = useState(initialBody);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const initializedRef = useRef(false);
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const latestDraftRef = useRef<Draft>({ body: initialBody, format: initialFormat });
  const lastSavedDraftRef = useRef<Draft>({ body: initialBody, format: initialFormat });

  const saveMutation = useMutation({
    mutationFn: (payload: { body: string; format: DocFormat }) =>
      upsertDocument(workspaceId, pageId, payload),
    onSuccess: (_data, variables) => {
      lastSavedDraftRef.current = variables;
      setSaveState('saved');
    },
  });
  const mutate = saveMutation.mutate;

  useEffect(() => {
    latestDraftRef.current = { body, format };
  }, [body, format]);

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

  useEffect(() => {
    return () => {
      if (readOnly) {
        return;
      }

      const latest = latestDraftRef.current;
      const lastSaved = lastSavedDraftRef.current;
      const hasUnsavedChanges =
        latest.body !== lastSaved.body || latest.format !== lastSaved.format;

      if (!hasUnsavedChanges) {
        return;
      }

      // Flush unsaved draft when navigating away quickly before debounce fires.
      void upsertDocument(workspaceId, pageId, latest);
    };
  }, [pageId, readOnly, workspaceId]);

  const onChangeBody = (next: string) => {
    if (readOnly) {
      return;
    }

    latestDraftRef.current = { body: next, format };
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
    latestDraftRef.current = { body: converted, format: next };
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

  const replaceSelection = (
    nextSelection: string,
    selectionStartOffset = 0,
    selectionEndOffset = 0,
  ) => {
    if (readOnly || format !== 'MARKDOWN') {
      return;
    }

    const textarea = editorTextareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const next =
      body.slice(0, start) + nextSelection + body.slice(end);

    onChangeBody(next);

    const nextStart = start + selectionStartOffset;
    const nextEnd = start + selectionEndOffset;

    window.requestAnimationFrame(() => {
      const active = editorTextareaRef.current;
      if (!active) {
        return;
      }

      active.focus();
      active.setSelectionRange(nextStart, nextEnd);
    });
  };

  const wrapSelection = (prefix: string, suffix: string, placeholder: string) => {
    if (readOnly || format !== 'MARKDOWN') {
      return;
    }

    const textarea = editorTextareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const selected = body.slice(start, end);
    const content = selected || placeholder;
    const nextSelection = `${prefix}${content}${suffix}`;
    const prefixLength = prefix.length;
    const selectionLength = content.length;

    replaceSelection(nextSelection, prefixLength, prefixLength + selectionLength);
  };

  const insertLinePrefix = (prefix: string, placeholder: string) => {
    wrapSelection(prefix, '', placeholder);
  };

  const insertTable = () => {
    const table = `| 열1 | 열2 |
| --- | --- |
| 값1 | 값2 |`;
    replaceSelection(table, 0, table.length);
  };

  const showMarkdownToolbar =
    format === 'MARKDOWN' && (activeTab === 'rich' || activeTab === 'markdown');

  if (mode === 'view') {
    return (
      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-neutral-700">미리보기</span>
          <span className="text-neutral-500">{format === 'MARKDOWN' ? 'Markdown' : 'HTML'}</span>
        </div>
        <div className="min-h-[320px] rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <DocumentPreview body={body} format={format} />
        </div>
      </section>
    );
  }

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

      {showMarkdownToolbar ? (
        <div className="flex flex-wrap gap-1 rounded-md border border-neutral-300 bg-neutral-50 p-2">
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => wrapSelection('**', '**', '굵게')}>
            굵게
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => wrapSelection('*', '*', '기울임')}>
            기울임
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => insertLinePrefix('# ', '제목')}>
            H1
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => insertLinePrefix('## ', '소제목')}>
            H2
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => insertLinePrefix('- ', '목록')}>
            목록
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => insertLinePrefix('1. ', '항목')}>
            번호
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => wrapSelection('`', '`', '코드')}>
            코드
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={() => wrapSelection('[', '](https://)', '링크 텍스트')}
          >
            링크
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={insertTable}>
            표
          </Button>
        </div>
      ) : null}

      {activeTab === 'rich' ? (
        format === 'MARKDOWN' ? (
          <textarea
            ref={editorTextareaRef}
            className="min-h-[320px] w-full rounded-md border border-neutral-300 p-3 font-mono text-sm"
            value={body}
            onChange={(event) => onChangeBody(event.target.value)}
            placeholder="Markdown으로 작성하세요."
            readOnly={readOnly}
          />
        ) : (
          <textarea
            className="min-h-[320px] w-full rounded-md border border-neutral-300 p-3 font-mono text-sm"
            value={body}
            onChange={(event) => onChangeBody(event.target.value)}
            placeholder="HTML 소스를 작성하세요."
            readOnly={readOnly}
          />
        )
      ) : null}

      {activeTab === 'markdown' ? (
        <textarea
          ref={format === 'MARKDOWN' ? editorTextareaRef : undefined}
          className="min-h-[320px] w-full rounded-md border border-neutral-300 p-3 font-mono text-sm"
          value={body}
          onChange={(event) => onChangeBody(event.target.value)}
          placeholder="소스를 편집하세요."
          readOnly={readOnly}
        />
      ) : null}

      {activeTab === 'preview' ? (
        <div className="min-h-[320px] rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <DocumentPreview body={body} format={format} />
        </div>
      ) : null}
    </section>
  );
}

export function HybridEditor({ workspaceId, pageId, mode = 'edit' }: HybridEditorProps) {
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
  const effectiveMode: EditorMode = readOnly ? 'view' : mode;

  return (
    <HybridEditorContent
      key={`${workspaceId}-${pageId}`}
      workspaceId={workspaceId}
      pageId={pageId}
      initialBody={initialBody}
      initialFormat={initialFormat}
      readOnly={readOnly}
      mode={effectiveMode}
    />
  );
}
