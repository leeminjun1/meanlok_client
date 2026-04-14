'use client';

import { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  type DefaultOptions,
} from '@tanstack/react-query';
import { Toaster } from 'sonner';

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions,
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
