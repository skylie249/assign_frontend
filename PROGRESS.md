# PROGRESS

## 완료한 세션
- [AS12] 2026-11-23 — 프로젝트 골격: Vite+React18+TS+Router+TanStack Query+Tailwind(v4),
  `vercel.json`/`api/_proxy.js`/`api/proxy.js` 프록시 패턴(`weekreport_frontend`와 동일 구조로
  새로 작성), 로그인 게이트(`/api/assign/me` 호출 → 401이면 로그인 화면) 구현 (아래 "AS12에서 한
  일" 참고).

## 현재 상태
- **2026-11-23: AS12(골격) 완료.** `register` 쪽 백엔드(AS0~AS8)·`wr-agent-platform` 집계(AS9)는
  이전에 이미 끝나 있었음(`SESSION_PLAN_ASSIGN.md` 참고). 다음 세션은 AS13(배치표 화면) —
  단, 권장 순서상 AS10/AS11(wr-agent-platform 대조표·엑셀 반영)이 아직 안 끝났으니 그쪽을 먼저
  할지는 사용자 판단.
- 로컬 개발 서버(`npm run dev`, 5173)에서 로컬 백엔드(8879)로 `/api` 프록시가 실제로 동작함을
  curl로 확인함(아래 참고). **실제 브라우저로 로그인해 `/api/assign/me` 응답이 화면에 표시되는지는
  사용자 확인 필요** — Claude는 실 계정 비밀번호가 없음(기존 세션들과 같은 제약).

## AS12에서 한 일 (2026-11-23)
- **스택**: React 18.3.1 + TypeScript + Vite 8 + react-router-dom 7 + `@tanstack/react-query` 5 +
  Tailwind **v4**(`@tailwindcss/vite` 플러그인 — `tailwind.config.js`/`postcss.config.js` 없이
  `src/index.css`에 `@import "tailwindcss";` 한 줄, CLAUDE.md는 버전을 명시하지 않아 설치 시점
  최신인 v4로 진행). `npm install`로 실제 설치된 버전 그대로 둠(`react-router-dom`은 CLAUDE.md
  작성 시점엔 v6 가정이었을 수 있으나 실제 최신은 v7 — API는 이번 세션이 쓴 범위(`BrowserRouter`/
  `Routes`/`Route`/`Navigate`)에서 호환됨).
- **디렉터리**: `src/app`(라우터·로그인 게이트), `src/pages/lead`(로그인·대시보드),
  `src/pages/confirm`(팀원 확인 자리), `src/api`(fetch 클라이언트·QueryClient). `features/`·
  `lib/`는 CLAUDE.md §9가 정한 자리지만 이번 세션엔 넣을 코드가 없어 디렉터리를 만들지 않음
  (AS13부터 실제로 쓸 때 추가).
- **라우팅**: `/` → `/app` 리다이렉트, `/app/*` → `LeadApp`(로그인 게이트), `/c/:token` →
  `ConfirmPage`(자리만, "준비 중" 표시 — 실제 토큰 조회·제출은 AS17).
- **로그인 게이트 설계 결정(계획에 암묵적이었던 부분을 이번 세션에서 확정)**: `weekreport.nexalab.app`
  과 `assign.nexalab.app`은 쿠키 도메인이 달라 세션을 공유하지 않는다 → **이 화면이 자체
  로그인 폼을 가지고 기존 `/api/auth/login`을 호출**하는 방식으로 확정(새 비밀번호 체계 없음,
  `weekreport_frontend/src/LoginScreen.jsx`의 구조를 참고했을 뿐 코드는 복사하지 않고 새로 작성).
  `LeadApp`이 `GET /api/assign/me`를 TanStack Query로 호출 → 401(`SessionOutError`)이면
  `LoginPage`, 아니면 `DashboardPage`에 역할·팀을 표시.
- **Vercel 프록시**: `weekreport_frontend/api/_proxy.js`·`vercel.json`과 **같은 패턴**(고정
  파일명 `api/proxy.js` + `?path=` 쿼리스트링, 쿠키/Origin/Referer/`CF-Access-*` 왕복)으로 새로
  작성 — `assign_frontend`는 `/agent/**` 프록시가 필요 없어(`wr-agent-platform` 직접 연동 화면이
  없음) `api/agent-proxy.js`는 만들지 않음. `BACKEND_API_ORIGIN`은 `weekreport_frontend`와 같은
  터널 주소(`weekreport-api.nexalab.app`)를 그대로 씀 — 백엔드가 같은 오리진에 `/api/assign/*`를
  추가했기 때문(CLAUDE.md §1).
- **검증(로컬, curl)**:
  ① `npm run build` 성공(타입 체크 포함),
  ② `npm run dev`(5173) → 로컬 백엔드(8879)로 `/api/assign/me` 프록시 → 401(로그인 안 한 상태,
  직접 8879를 두드린 것과 동일한 401 확인),
  ③ `POST /api/auth/login`에 가짜 계정 → `{"result":"wrongMid"}`(Origin/Referer를 `localhost:5173`
  으로 보냈을 때만 통과 — `OriginCheckInterceptor`의 허용 목록에 `http://localhost:5173`이 이미
  있었음, AS1 이전부터 있던 설정이라 이번 세션에서 추가하지 않음).
  **실제 팀장 계정으로 브라우저에 로그인해 대시보드에 역할·팀이 뜨는 것은 라이브로 확인 못함**
  (Claude는 실 계정 비밀번호가 없음) — 사용자 확인 필요.
- **Tailwind v4 설정 주의사항(다음 세션에 참고)**: `tailwind.config.js`가 없다. 커스텀 테마가
  필요해지면(AS13 배치표 그리드 등) `src/index.css`의 `@theme { ... }` 블록으로 추가한다
  (v3의 JS config 방식이 아님).
- **빌드 중 겪은 문제**: `tsc -b`(project reference 빌드)로 시작했다가 `vite.config.ts`를
  컴파일한 `vite.config.js`/`vite.config.d.ts`가 프로젝트 루트에 그대로 남는 문제를 발견 —
  `tsconfig.json`의 `references`를 빼고 빌드 스크립트를 `tsc --noEmit && vite build`로 바꿔
  해결(`tsconfig.node.json`은 에디터가 `vite.config.ts`를 타입체크할 때만 쓰고 빌드 체인에는
  안 걸림). `*.tsbuildinfo`도 `.gitignore`에 추가.
- **하지 않은 것**: react-hook-form·zod·date-fns·docx·Vitest·Playwright는 아직 설치하지
  않음(CLAUDE.md §9가 선언한 전체 스택이지만, 이번 세션 범위(골격+로그인)에 당장 쓸 데가 없어서
  — AS13(배치표, RHF+zod)·AS15(워드, docx)·AS17(Playwright)에서 실제로 쓸 때 추가).
