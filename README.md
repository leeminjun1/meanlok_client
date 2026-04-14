# Mean록 Client

Mean록 프론트엔드 애플리케이션입니다.

- Framework: Next.js (App Router)
- Language: TypeScript
- UI: Tailwind CSS
- State/Data: TanStack Query
- Auth: Supabase Auth (Client SDK)

## 주요 기능

- 회원가입 / 로그인
- 대시보드 (내 워크스페이스, 공유받은 페이지)
- 워크스페이스/페이지 트리 탐색
- 페이지 생성/이름변경/이동/복제
- 하이브리드 에디터
  - Rich 편집
  - Markdown 소스
  - Preview
- 페이지 공유
  - 이메일 기반 공유
  - 링크 전용 초대 생성
  - 상속 공유/대기 초대 조회
- 권한 기반 UI
  - `EDITOR`: 편집 가능
  - `VIEWER`: 읽기 전용

## 사전 요구사항

- Node.js 22+
- npm 10+
- 실행 중인 `meanlok_server` (기본: `http://localhost:3001`)
- Supabase 프로젝트

## 환경 변수

`.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
```

필수 값:

- `NEXT_PUBLIC_API_URL` (예: `http://localhost:3001/api`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 로컬 실행

```bash
npm install
npm run dev
```

- Local: `http://localhost:3000`

## 빌드 / 린트

```bash
npm run build
npm run lint
```

## 주요 경로

- `src/app/(app)/dashboard/page.tsx`: 대시보드
- `src/app/(app)/w/[workspaceId]/p/[pageId]/page.tsx`: 페이지 편집 화면
- `src/components/modals/SharePageModal.tsx`: 페이지 공유 모달
- `src/app/page-invites/[token]/page.tsx`: 페이지 초대 수락
- `src/lib/api/endpoints.ts`: API 호출 집합

## 참고

- 페이지 초대는 현재 메일 실제 발송 대신 링크 기반 수락 흐름을 사용합니다.
