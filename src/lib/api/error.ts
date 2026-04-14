import { isAxiosError } from 'axios';

function normalizeMessage(message: unknown): string | null {
  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message)) {
    const joined = message.filter((item) => typeof item === 'string').join(', ');
    return joined || null;
  }

  return null;
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data as
      | {
          message?: unknown;
          error?: { message?: string };
        }
      | undefined;
    const apiMessage =
      normalizeMessage(payload?.message) || payload?.error?.message;
    return apiMessage || error.message || '요청 중 오류가 발생했습니다.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '요청 중 오류가 발생했습니다.';
}
