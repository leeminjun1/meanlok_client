'use client';

import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { aiAsk, getAiUsage } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import type { AiErrorCode, AiUsageSummary } from '@/types';
import { Button } from '@/components/ui/Button';

const DEFAULT_MAX_QUESTION_CHARS = 2000;

type AiPanelError = {
  code: AiErrorCode;
  message: string;
  retryAfterSec?: number;
  resetAt?: string;
  maxChars?: number;
};

function normalizeMessage(message: unknown): string | null {
  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message)) {
    const items = message.filter((value): value is string => typeof value === 'string');
    return items.length > 0 ? items.join(', ') : null;
  }

  return null;
}

function toPositiveInt(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.ceil(parsed);
}

function toAiErrorCode(value: unknown): AiErrorCode {
  switch (value) {
    case 'QUOTA_EXCEEDED':
    case 'RATE_LIMITED':
    case 'INPUT_TOO_LONG':
    case 'TIMEOUT':
    case 'NETWORK':
    case 'AI_PROVIDER_AUTH_FAILED':
    case 'REQUEST_CANCELED':
      return value;
    default:
      return 'SERVER_ERROR';
  }
}

function formatResetAt(resetAt: string) {
  const date = new Date(resetAt);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(date);
}

function parseAiError(error: unknown): AiPanelError {
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return {
        code: 'REQUEST_CANCELED',
        message: '요청을 취소했어요.',
      };
    }

    if (!error.response) {
      return {
        code: 'NETWORK',
        message: '네트워크 연결이 불안정해요. 잠시 후 다시 시도해 주세요.',
      };
    }

    const payload = error.response.data as
      | {
          message?: unknown;
          error?: {
            code?: unknown;
            retryAfterSec?: unknown;
            resetAt?: unknown;
            maxChars?: unknown;
          };
        }
      | undefined;

    const code = toAiErrorCode(payload?.error?.code);
    const retryAfterSec = toPositiveInt(payload?.error?.retryAfterSec);
    const resetAt =
      typeof payload?.error?.resetAt === 'string' ? payload.error.resetAt : undefined;
    const maxChars = toPositiveInt(payload?.error?.maxChars);
    const messageFromApi = normalizeMessage(payload?.message);

    if (code === 'QUOTA_EXCEEDED') {
      return {
        code,
        message: messageFromApi || '오늘 AI 사용량을 다 썼어요. 내일 다시 시도해 주세요.',
        retryAfterSec,
        resetAt,
      };
    }

    if (code === 'RATE_LIMITED') {
      return {
        code,
        message: messageFromApi || '요청이 많아요. 잠시 후 다시 시도해 주세요.',
        retryAfterSec,
      };
    }

    if (code === 'INPUT_TOO_LONG') {
      return {
        code,
        message: messageFromApi || '질문이 너무 길어요. 길이를 줄여서 다시 시도해 주세요.',
        maxChars,
      };
    }

    if (code === 'TIMEOUT') {
      return {
        code,
        message: messageFromApi || '응답이 지연되고 있어요. 다시 시도해 주세요.',
      };
    }

    if (code === 'NETWORK') {
      return {
        code,
        message: messageFromApi || 'AI 서버와 연결이 불안정해요. 다시 시도해 주세요.',
      };
    }

    if (code === 'AI_PROVIDER_AUTH_FAILED') {
      return {
        code,
        message: messageFromApi || 'AI 설정에 문제가 있어요. 관리자에게 문의해 주세요.',
      };
    }

    return {
      code: 'SERVER_ERROR',
      message: messageFromApi || getErrorMessage(error),
      retryAfterSec,
    };
  }

  return {
    code: 'SERVER_ERROR',
    message: getErrorMessage(error),
  };
}

export function AIPanel() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [panelError, setPanelError] = useState<AiPanelError | null>(null);
  const [retryCountdownSec, setRetryCountdownSec] = useState(0);
  const [isSlowResponse, setIsSlowResponse] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const usageQuery = useQuery({
    queryKey: ['ai-usage'],
    queryFn: getAiUsage,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const askMutation = useMutation({
    mutationFn: () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      return aiAsk({ question: input.trim() }, { signal: controller.signal });
    },
    onMutate: () => {
      setPanelError(null);
      setIsSlowResponse(false);
    },
    onSuccess: (data) => {
      setResult(data.result);
      setPanelError(null);
      setRetryCountdownSec(0);
      queryClient.setQueryData<AiUsageSummary>(['ai-usage'], data.usage);
    },
    onError: (error) => {
      const parsedError = parseAiError(error);

      if (parsedError.code === 'REQUEST_CANCELED') {
        return;
      }

      setPanelError(parsedError);
      if (parsedError.retryAfterSec) {
        setRetryCountdownSec(parsedError.retryAfterSec);
      }
      toast.error(parsedError.message);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });

  const isPending = askMutation.isPending;
  const maxChars = panelError?.maxChars ?? DEFAULT_MAX_QUESTION_CHARS;
  const inputLength = input.length;
  const hasInput = input.trim().length > 0;
  const isInputTooLong = inputLength > maxChars;
  const usage = usageQuery.data;
  const isQuotaExhausted = usage !== undefined && usage.remainingToday <= 0;
  const isRetryLocked = retryCountdownSec > 0;
  const canAsk = hasInput && !isInputTooLong && !isQuotaExhausted && !isRetryLocked;

  useEffect(() => {
    if (retryCountdownSec <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRetryCountdownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [retryCountdownSec]);

  useEffect(() => {
    if (!isPending) {
      setIsSlowResponse(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsSlowResponse(true);
    }, 15_000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isPending]);

  const copyResult = async () => {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(result);
    toast.success('결과를 복사했습니다.');
  };

  const copyQuestion = async () => {
    if (!input.trim()) {
      return;
    }

    await navigator.clipboard.writeText(input.trim());
    toast.success('질문을 복사했습니다.');
  };

  const cancelRequest = () => {
    if (!askMutation.isPending) {
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsSlowResponse(false);
  };

  const retryAsk = () => {
    if (!canAsk || askMutation.isPending) {
      return;
    }

    setPanelError(null);
    askMutation.mutate();
  };

  const usageLabel = usage
    ? `오늘 ${usage.usedToday}/${usage.dailyLimit}회 사용`
    : usageQuery.isLoading
      ? '사용량 확인 중...'
      : '사용량 정보 없음';

  const usageResetLabel = usage ? `초기화: ${formatResetAt(usage.resetAt)}` : null;

  return (
    <aside
      className={`overflow-hidden border-l border-neutral-200 bg-white transition-all ${
        open ? 'w-[320px]' : 'w-11'
      }`}
    >
      <div className="flex h-full min-h-0">
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3">
            <h3 className="text-sm font-semibold text-neutral-800">AI 도우미</h3>

            <textarea
              className="min-h-28 w-full rounded-md border border-neutral-300 p-2 text-sm"
              placeholder="AI에게 질문하세요."
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                if (panelError?.code === 'INPUT_TOO_LONG') {
                  setPanelError(null);
                }
              }}
            />

            <div className="flex items-center justify-between text-xs">
              <span className={isInputTooLong ? 'text-red-600' : 'text-neutral-500'}>
                {inputLength}/{maxChars}자
              </span>
              <span className="text-neutral-500">{usageLabel}</span>
            </div>

            {usageResetLabel ? (
              <p className="text-[11px] text-neutral-400">{usageResetLabel}</p>
            ) : null}

            {isRetryLocked ? (
              <p className="text-xs text-amber-600">
                {retryCountdownSec}초 후 다시 시도할 수 있어요.
              </p>
            ) : null}

            {isQuotaExhausted ? (
              <p className="text-xs text-amber-700">
                오늘 사용량을 모두 사용했어요.
              </p>
            ) : null}

            {isInputTooLong ? (
              <p className="text-xs text-red-600">
                질문이 너무 길어요. {maxChars}자 이하로 줄여주세요.
              </p>
            ) : null}

            {panelError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                <p>{panelError.message}</p>
                {panelError.code === 'QUOTA_EXCEEDED' && panelError.resetAt ? (
                  <p className="mt-1 text-xs text-red-600">
                    다시 시도 가능: {formatResetAt(panelError.resetAt)}
                  </p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={retryAsk}
                    disabled={!canAsk || isPending}
                  >
                    재시도
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyQuestion}
                    disabled={!hasInput}
                  >
                    질문 복사
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => askMutation.mutate()}
                disabled={!canAsk || isPending}
              >
                {isPending ? '답변 생성 중...' : '질문하기'}
              </Button>
              {isPending ? (
                <Button size="sm" variant="outline" onClick={cancelRequest}>
                  취소
                </Button>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 p-2">
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <span className="text-xs text-neutral-500">
                  {isPending
                    ? isSlowResponse
                      ? '응답 지연 중...'
                      : '답변 생성 중...'
                    : '답변'}
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
              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words text-sm text-neutral-700">
                {result}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
