import { isAxiosError } from 'axios';

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string } | undefined)
      ?.message;
    return apiMessage || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '요청 중 오류가 발생했습니다.';
}
