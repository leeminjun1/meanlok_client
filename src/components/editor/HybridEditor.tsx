'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPage, uploadDocumentImage, upsertDocument } from '@/lib/api/endpoints';
import type { DocFormat, DocumentDelta } from '@/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/error';
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
type SavePayload = {
  format: DocFormat;
  expectedVersion?: number;
  body?: string;
  delta?: DocumentDelta;
};

function toSingleDelta(before: string, after: string): DocumentDelta | null {
  if (before === after) {
    return null;
  }

  const shortestLength = Math.min(before.length, after.length);
  let start = 0;
  while (start < shortestLength && before[start] === after[start]) {
    start += 1;
  }

  let beforeEnd = before.length - 1;
  let afterEnd = after.length - 1;
  while (
    beforeEnd >= start &&
    afterEnd >= start &&
    before[beforeEnd] === after[afterEnd]
  ) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  return {
    start,
    deleteCount: Math.max(0, beforeEnd - start + 1),
    insertText: after.slice(start, afterEnd + 1),
  };
}

function buildSavePayload(
  latest: Draft,
  lastSaved: Draft,
  expectedVersion: number,
): SavePayload {
  if (latest.format === lastSaved.format) {
    const delta = toSingleDelta(lastSaved.body, latest.body);
    if (delta) {
      const fullBodyCost = latest.body.length;
      const deltaCost = delta.insertText.length + 48;
      if (deltaCost + 24 < fullBodyCost) {
        return {
          format: latest.format,
          expectedVersion,
          delta,
        };
      }
    }
  }

  return {
    format: latest.format,
    expectedVersion,
    body: latest.body,
  };
}

function mergeDocumentIntoPageCache(
  currentPage: any,
  nextDocument: { body: string; format: DocFormat; version?: number },
) {
  if (!currentPage) {
    return currentPage;
  }

  return {
    ...currentPage,
    document: {
      ...(currentPage.document ?? {}),
      body: nextDocument.body,
      format: nextDocument.format,
      version: nextDocument.version ?? currentPage.document?.version ?? 1,
    },
  };
}

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
  initialVersion: number;
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
  initialVersion,
  readOnly,
  mode,
}: HybridEditorContentProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<EditorTab>('rich');
  const [format, setFormat] = useState<DocFormat>(initialFormat);
  const [body, setBody] = useState(initialBody);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const initializedRef = useRef(false);
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const latestDraftRef = useRef<Draft>({ body: initialBody, format: initialFormat });
  const lastSavedDraftRef = useRef<Draft>({ body: initialBody, format: initialFormat });
  const lastSavedVersionRef = useRef(initialVersion);
  const savingRef = useRef(false);
  const saveRequestedRef = useRef(false);

  const saveMutation = useMutation({
    mutationFn: (payload: SavePayload) => upsertDocument(workspaceId, pageId, payload),
  });

  const imageUploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocumentImage(workspaceId, pageId, file),
  });

  const flushDraft = async () => {
    if (readOnly) {
      return;
    }

    saveRequestedRef.current = true;
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;

    try {
      while (saveRequestedRef.current) {
        saveRequestedRef.current = false;
        const latest = latestDraftRef.current;
        const lastSaved = lastSavedDraftRef.current;

        if (latest.body === lastSaved.body && latest.format === lastSaved.format) {
          continue;
        }

        setSaveState('saving');

        try {
          const saved = await saveMutation.mutateAsync(
            buildSavePayload(latest, lastSaved, lastSavedVersionRef.current),
          );

          lastSavedVersionRef.current = saved?.version ?? lastSavedVersionRef.current + 1;
          const normalizedSaved: Draft = {
            body: saved?.body ?? latest.body,
            format: saved?.format ?? latest.format,
          };
          lastSavedDraftRef.current = normalizedSaved;
          queryClient.setQueryData(['page', workspaceId, pageId], (current: any) =>
            mergeDocumentIntoPageCache(current, {
              body: normalizedSaved.body,
              format: normalizedSaved.format,
              version: saved?.version,
            }),
          );
          void queryClient.invalidateQueries({ queryKey: ['page-meta', workspaceId, pageId] });

          const currentLatest = latestDraftRef.current;
          if (
            currentLatest.body === latest.body &&
            currentLatest.format === latest.format
          ) {
            latestDraftRef.current = normalizedSaved;
            setBody(normalizedSaved.body);
            setFormat(normalizedSaved.format);
          }

          setSaveState('saved');
        } catch (error) {
          setSaveState('idle');
          const payload = (error as any)?.response?.data as
            | { error?: { code?: string; latestVersion?: number } }
            | undefined;

          if (payload?.error?.code === 'VERSION_CONFLICT') {
            if (typeof payload.error.latestVersion === 'number') {
              lastSavedVersionRef.current = payload.error.latestVersion;
            }
            toast.error(
              '다른 기기에서 먼저 저장됐어요. 최신 버전 기준으로 다시 저장을 시도합니다.',
            );
            saveRequestedRef.current = true;
            continue;
          }

          toast.error(getErrorMessage(error));
          break;
        }
      }
    } finally {
      savingRef.current = false;
    }
  };

  const handleBlurSave = () => {
    void flushDraft();
  };

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
      void flushDraft();
    }, 2500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [body, format, readOnly]);

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
      void upsertDocument(workspaceId, pageId, {
        ...buildSavePayload(latest, lastSaved, lastSavedVersionRef.current),
      }).then((saved) => {
        if (!saved) {
          return;
        }
        queryClient.setQueryData(['page', workspaceId, pageId], (current: any) =>
          mergeDocumentIntoPageCache(current, {
            body: saved.body,
            format: saved.format,
            version: saved.version,
          }),
        );
      });
    };
  }, [pageId, queryClient, readOnly, workspaceId]);

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
    : imageUploadMutation.isPending
      ? '이미지 업로드 중...'
    : saveMutation.isPending || saveState === 'saving'
      ? '저장 중...'
      : saveState === 'saved'
        ? '저장됨'
        : '초기 상태';

  const insertAtSelection = (
    nextSelection: string,
    selectionStartOffset = 0,
    selectionEndOffset = 0,
  ) => {
    if (readOnly) {
      return;
    }

    const textarea = editorTextareaRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
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

    insertAtSelection(nextSelection, prefixLength, prefixLength + selectionLength);
  };

  const insertLinePrefix = (prefix: string, placeholder: string) => {
    wrapSelection(prefix, '', placeholder);
  };

  const insertTable = () => {
    const table = `| 열1 | 열2 |
| --- | --- |
| 값1 | 값2 |`;
    insertAtSelection(table, 0, table.length);
  };

  const insertImageSnippet = (imageUrl: string) => {
    const snippet =
      format === 'MARKDOWN'
        ? `![이미지](${imageUrl})`
        : `<img src="${imageUrl}" alt="이미지" />`;

    insertAtSelection(snippet, snippet.length, snippet.length);
    toast.success('이미지를 삽입했어요.');
  };

  const triggerImageFilePicker = () => {
    if (readOnly || imageUploadMutation.isPending) {
      return;
    }

    imageInputRef.current?.click();
  };

  const onSelectImageFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    imageUploadMutation.mutate(file, {
      onSuccess: (response) => {
        insertImageSnippet(response.url);
        queryClient.setQueryData(['page', workspaceId, pageId], (current: any) =>
          mergeDocumentIntoPageCache(current, {
            body: latestDraftRef.current.body,
            format: latestDraftRef.current.format,
          }),
        );
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };

  const onPasteImage = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (readOnly || imageUploadMutation.isPending) {
      return;
    }

    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }

    for (const item of items) {
      if (item.kind !== 'file' || !item.type.startsWith('image/')) {
        continue;
      }

      const file = item.getAsFile();
      if (!file) {
        continue;
      }

      event.preventDefault();
      imageUploadMutation.mutate(file, {
        onSuccess: (response) => {
          insertImageSnippet(response.url);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      });
      break;
    }
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={triggerImageFilePicker}
            disabled={readOnly || imageUploadMutation.isPending}
          >
            이미지
          </Button>
          <select
            className="h-9 rounded-md border border-neutral-300 bg-white px-2"
            value={format}
            onChange={(event) => onChangeFormat(event.target.value as DocFormat)}
            onBlur={handleBlurSave}
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

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={onSelectImageFile}
      />

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
            onBlur={handleBlurSave}
            onPaste={onPasteImage}
            placeholder="Markdown으로 작성하세요."
            readOnly={readOnly}
          />
        ) : (
          <textarea
            ref={editorTextareaRef}
            className="min-h-[320px] w-full rounded-md border border-neutral-300 p-3 font-mono text-sm"
            value={body}
            onChange={(event) => onChangeBody(event.target.value)}
            onBlur={handleBlurSave}
            onPaste={onPasteImage}
            placeholder="HTML 소스를 작성하세요."
            readOnly={readOnly}
          />
        )
      ) : null}

      {activeTab === 'markdown' ? (
        <textarea
          ref={editorTextareaRef}
          className="min-h-[320px] w-full rounded-md border border-neutral-300 p-3 font-mono text-sm"
          value={body}
          onChange={(event) => onChangeBody(event.target.value)}
          onBlur={handleBlurSave}
          onPaste={onPasteImage}
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
    staleTime: 15 * 1000,
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
  const initialVersion = pageQuery.data?.document?.version ?? 1;
  const readOnly = pageQuery.data?.accessRole !== 'EDITOR';
  const effectiveMode: EditorMode = readOnly ? 'view' : mode;

  return (
    <HybridEditorContent
      key={`${workspaceId}-${pageId}`}
      workspaceId={workspaceId}
      pageId={pageId}
      initialBody={initialBody}
      initialFormat={initialFormat}
      initialVersion={initialVersion}
      readOnly={readOnly}
      mode={effectiveMode}
    />
  );
}
