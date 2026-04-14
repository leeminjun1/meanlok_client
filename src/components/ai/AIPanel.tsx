'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { aiDraft, aiRefine, aiSummarize } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { Button } from '@/components/ui/Button';

interface AIPanelProps {
  text?: string;
}

export function AIPanel({ text = '' }: AIPanelProps) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState(text);
  const [result, setResult] = useState('');

  const summarizeMutation = useMutation({
    mutationFn: () => aiSummarize({ text: input }),
    onSuccess: (data) => setResult(data.result),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const refineMutation = useMutation({
    mutationFn: () => aiRefine({ text: input }),
    onSuccess: (data) => setResult(data.result),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const draftMutation = useMutation({
    mutationFn: () => aiDraft({ prompt: input }),
    onSuccess: (data) => setResult(data.result),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const isPending =
    summarizeMutation.isPending || refineMutation.isPending || draftMutation.isPending;

  const copyResult = async () => {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(result);
    toast.success('결과를 복사했습니다.');
  };

  return (
    <aside
      className={`border-l border-neutral-200 bg-white transition-all ${
        open ? 'w-[320px]' : 'w-11'
      }`}
    >
      <div className="flex h-full">
        <button
          type="button"
          className="h-full w-11 border-r border-neutral-200 text-neutral-500 hover:bg-neutral-100"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="AI 패널 토글"
        >
          {open ? (
            <ChevronRight className="mx-auto h-4 w-4" />
          ) : (
            <ChevronLeft className="mx-auto h-4 w-4" />
          )}
        </button>

        {open ? (
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
            <h3 className="text-sm font-semibold text-neutral-800">AI 도우미</h3>

            <textarea
              className="min-h-28 w-full rounded-md border border-neutral-300 p-2 text-sm"
              placeholder="텍스트 또는 프롬프트를 입력하세요."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => summarizeMutation.mutate()}
                disabled={!input || isPending}
              >
                요약
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refineMutation.mutate()}
                disabled={!input || isPending}
              >
                다듬기
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => draftMutation.mutate()}
                disabled={!input || isPending}
              >
                초안
              </Button>
            </div>

            <div className="flex min-h-40 flex-1 flex-col rounded-md border border-neutral-200 bg-neutral-50 p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  {isPending ? '생성 중...' : '결과'}
                </span>
                <button
                  type="button"
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-200"
                  onClick={copyResult}
                  disabled={!result}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-neutral-700">{result}</pre>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
