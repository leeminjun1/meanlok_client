'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getOpsMetrics } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
      {hint ? <p className="mt-2 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export default function OpsMetricsPage() {
  const metricsQuery = useQuery({
    queryKey: ['ops-metrics'],
    queryFn: getOpsMetrics,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });

  const data = metricsQuery.data;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">운영 지표</h1>
          <p className="mt-1 text-sm text-neutral-600">
            주소: <span className="font-mono">/ops/metrics</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            대시보드로
          </Link>
          <Button
            variant="outline"
            onClick={() => void metricsQuery.refetch()}
            disabled={metricsQuery.isFetching}
          >
            {metricsQuery.isFetching ? '갱신 중...' : '지금 갱신'}
          </Button>
        </div>
      </div>

      {metricsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {metricsQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          지표를 불러오지 못했습니다. {getErrorMessage(metricsQuery.error)}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="HTTP P95"
              value={`${data.http.p95Ms}ms`}
              hint={`최근 ${data.windowMinutes}분 / 총 ${data.http.total}건`}
            />
            <StatCard
              label="문서 저장 실패율"
              value={`${data.documentSaves.failureRatePct}%`}
              hint={`${data.documentSaves.failed} / ${data.documentSaves.total}`}
            />
            <StatCard
              label="AI 에러율"
              value={`${data.ai.errorRatePct}%`}
              hint={`${data.ai.failed} / ${data.ai.total}`}
            />
            <StatCard
              label="서버 업타임"
              value={`${Math.floor(data.uptimeSec / 60)}분`}
              hint={`생성 시각 ${new Date(data.generatedAt).toLocaleString()}`}
            />
          </div>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">요청량 상위 라우트</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                    <th className="py-2 pr-4">Route</th>
                    <th className="py-2 pr-4">Count</th>
                    <th className="py-2 pr-4">P95</th>
                    <th className="py-2">Error %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.http.routes.length === 0 ? (
                    <tr>
                      <td className="py-3 text-neutral-500" colSpan={4}>
                        아직 수집된 요청이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    data.http.routes.map((route) => (
                      <tr key={route.route} className="border-b border-neutral-100">
                        <td className="py-2 pr-4 font-mono text-xs text-neutral-700">
                          {route.route}
                        </td>
                        <td className="py-2 pr-4 text-neutral-800">{route.count}</td>
                        <td className="py-2 pr-4 text-neutral-800">{route.p95Ms}ms</td>
                        <td className="py-2 text-neutral-800">{route.errorRatePct}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">AI 에러 코드 분포</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ai.errorsByCode.length === 0 ? (
                    <tr>
                      <td className="py-3 text-neutral-500" colSpan={2}>
                        최근 구간에 AI 에러가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    data.ai.errorsByCode.map((errorItem) => (
                      <tr key={errorItem.code} className="border-b border-neutral-100">
                        <td className="py-2 pr-4 font-mono text-xs text-neutral-700">
                          {errorItem.code}
                        </td>
                        <td className="py-2 text-neutral-800">{errorItem.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
