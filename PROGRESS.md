# PROGRESS

## 완료한 세션
- [AS12] 2026-11-23 — 프로젝트 골격: Vite+React18+TS+Router+TanStack Query+Tailwind(v4),
  `vercel.json`/`api/_proxy.js`/`api/proxy.js` 프록시 패턴(`weekreport_frontend`와 동일 구조로
  새로 작성), 로그인 게이트(`/api/assign/me` 호출 → 401이면 로그인 화면) 구현 (아래 "AS12에서 한
  일" 참고).
- [AS13] 2026-11-23 — 배치표 화면: 팀원별 섹션 + 프로젝트/역할/투입률 행 편집, react-hook-form
  `useFieldArray`로 실시간 1인 합계 100% 검증, "지난달과 동일"(덮어쓰기 확인 포함) 버튼 (아래
  "AS13에서 한 일" 참고).
- [AS14] 2026-11-23 — 휴가 월말 일괄 입력 화면: 팀원별 섹션 + 기간·일수 행 편집, 시작일을
  고르면 종료일이 자동으로 같은 날로 채워지는 단축 입력(종일 기본값), "반차" 버튼으로 0.5일
  고정 (아래 "AS14에서 한 일" 참고).

## 현재 상태
- **2026-11-23: AS14(휴가 월말 일괄 입력) 완료.** `register` 쪽 백엔드(AS0~AS8)·
  `wr-agent-platform` 집계(AS9)는 이전에 이미 끝나 있었음(`SESSION_PLAN_ASSIGN.md` 참고).
  다음 세션은 AS15(이슈 화면 + 워드 다운로드) — 권장 순서상 AS10/AS11(wr-agent-platform
  대조표·엑셀 반영)이 아직 안 끝났으니 그쪽을 먼저 할지는 사용자 판단.
- 로컬 개발 서버(`npm run dev`, 5173)에서 로컬 백엔드(8879)로 `/api/assign/*` 전체(me·members·
  projects·assignments·leaves) 프록시가 실제로 동작함을 curl로 확인함(미인증 401 일관성). **실제
  팀장 계정으로 브라우저에 로그인해 배치표·휴가 화면이 그려지고 저장되는 것은 사용자 확인 필요** —
  Claude는 실 계정 비밀번호가 없음(기존 세션들과 같은 제약).

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

## AS13에서 한 일 (2026-11-23)
- **설치**: `react-hook-form`, `zod`(v4), `@hookform/resolvers`(v7, zod v4 지원), `date-fns`.
- **백엔드 계약 확인(코드 읽기, `AssignApiController`/`AssignService`/`assign_SQL.xml`)**:
  `GET/PUT .../assignments?month=`의 각 배치 행은 `{memail, job_id, role_name, ratio}`
  (PUT 바디는 `{assignments:[...]}`), 팀 멤버는 `{memail, mname, mposition, mposName, work_type,
  standard_hours, joined_on, left_on}`, 프로젝트는 `{job_id, job_name, job_order, category}`.
  저장은 한 사람 ratio 합이 100이 아니어도 막지 않고 `warnings:[{memail,total_ratio}]`만 돌려줌
  (CLAUDE.md §5.1 그대로) — `AssignService.computeRatioWarnings`와 **같은 공식**(오차 0.01)을
  화면에도 그대로 구현해 서버·화면의 "100%" 판정이 어긋나지 않게 함.
  `copy-previous`는 대상 월에 데이터가 있으면 `overwrite=true` 없이 `needs_confirm`만 반환.
- **클라이언트(`src/api/client.ts`) 확장**: `getTeamMembers`/`getProjects`/`getAssignments`/
  `saveAssignments`/`copyPreviousAssignments` 추가. **버그를 세션 중 발견·수정**: 기존 `request()`
  헬퍼가 `!res.ok`면 무조건 generic Error를 던져서, 배치표 저장이 "팀 구성원이 아닙니다" 같은
  사유로 400을 돌려줄 때 그 메시지가 그대로 버려지고 있었다 — 응답 `content-type`이
  `application/json`이면 상태코드와 무관하게 파싱해서 호출자가 `result`/`message`를 보고
  분기하도록 수정(로그인 등 기존 2xx 전용 호출에는 영향 없음).
- **화면 설계**: 팀장이 1인당 여러 프로젝트에 각각 다른 역할·비율로 배치될 수 있어(CLAUDE.md
  §5.1) **고정된 "N명×M프로젝트" 테이블 그리드가 아니라, 팀원별 섹션 + 그 사람의 배치 행 목록**
  (프로젝트 선택 + 역할 입력 + 비율 입력 + 삭제, 섹션 하단에 "+ 줄 추가")으로 구현. 10명×5프로젝트
  완료 기준은 "10명 각자가 평균 ~0.5개 프로젝트에 배치된" 현재 테스트 데이터보다 많은 행을 다룰
  수 있는 구조로 충족(멤버 수·행 수에 상한 없음, 실제 수치로는 아직 라이브 검증 못함 — 아래 참고).
- **실시간 100% 검증**: `useFieldArray`(RHF) + `useWatch`로 모든 행 값을 구독, `memail`별로 묶어
  합계를 `useMemo`로 계산 → 섹션 헤더에 "합계 N%" 배지(녹색/빨강)로 즉시 표시. 저장 버튼은 막지
  않음(경고만, CLAUDE.md §5.1 그대로) — 서버 응답의 `warnings`도 저장 후 메시지로 보여줌.
- **"지난달과 동일"**: `overwrite=false`로 먼저 호출 → `needs_confirm`이면 인라인 확인 배너
  ("기존 배치 N건이 있습니다. 덮어쓸까요?")를 보여주고, 사용자가 누르면 `overwrite=true`로 재호출.
  `no_source`(지난달 배치 없음)·`SUCCESS`(복사 건수) 메시지도 구분해서 표시.
- **라우팅/레이아웃**: `LeadLayout`(새 파일, 상단 네비게이션 "대시보드"/"배치표" + 로그아웃)을
  추가하고 `DashboardPage`에서 로그아웃 버튼을 레이아웃으로 옮김. `/app` 인덱스 = 대시보드,
  `/app/assignments` = 배치표(팀 코드가 없는 계정은 네비게이션에 "배치표" 링크 자체를 숨김).
- **검증(로컬, curl만 — 아래 "사용자 확인 필요" 참고)**:
  ① `npm run build` 성공(타입 체크 포함),
  ② `npm run dev`로 로컬 백엔드 프록시 — `GET .../members`·`GET .../projects?team=`·
  `GET .../assignments?month=` 전부 미인증 상태에서 401로 일관됨(직접 8879를 두드린 것과 동일).
  **실제 로그인 후 배치표 그리드가 그려지고, 비율 변경 시 합계 배지가 실시간으로 바뀌고, 저장·
  "지난달과 동일"이 실제로 동작하는지는 라이브로 확인 못함** — 사용자가 이번 세션 중 브라우저
  자동화(claude-in-chrome)로 직접 확인하는 것도 보류시켜서, AS2 당시 썼던 테스트 데이터
  (`D26-BA1002`, 2026-11/12월, ratio 100%)가 여전히 맞는 화면을 그리는지 포함해 다음에 브라우저로
  확인 필요.
- **알아둘 제약(기록, 다음에 영향)**: 프로젝트 선택은 평범한 `<select>`이고 활성 프로젝트가
  89건(AS1 조사 기준)이라 검색 없이 스크롤해서 찾아야 한다 — 쓰다 보니 불편하면 이후 세션에서
  검색 가능한 콤보박스로 바꿀 것. 역할(`role_name`)은 자유 텍스트 50자 제한만 두고 선택 목록을
  만들지 않음(계획에 선택 목록 요구 없음).

## AS14에서 한 일 (2026-11-23)
- **백엔드 계약 확인(코드 읽기, `AssignApiController`/`AssignService`/`assign_SQL.xml`)**:
  `GET .../leaves?month=`는 `{team_code, month, leaves:[{id,memail,mname,starts_on,ends_on,days,
  source}]}`, `PUT`은 `{leaves:[{memail,starts_on,ends_on,days,source}]}`. `source`를 안 주면
  서버가 `groupware_approved`로 채워주지만(`AssignService.saveLeaves`), 화면에서는 명시적으로
  항상 `'groupware_approved'`를 보내도록 함 — 팀장이 입력하는 휴가는 전부 그룹웨어 승인 건이고
  (CLAUDE.md §5.2), `member_reported`는 AS7의 "달라짐" 응답 반영 경로에서만 쓰이는 값이라 이
  화면이 건드릴 값이 아님. 서버가 `endsOn.isBefore(startsOn)`·`days<=0`을 400으로 막으므로
  같은 조건을 zod `refine`으로 화면에도 두어 즉시 피드백.
- **"1분 안에 10명 입력" 설계**: AS13과 같은 "팀원별 섹션 + 행 목록" 구조를 재사용했지만, 가장
  흔한 경우(하루 전체 휴가)의 입력을 줄이는 데 집중함 — 시작일을 고르면 종료일이 비어있거나
  시작일보다 이전이면 자동으로 같은 날로 채워짐(종일 기본 가정), 일수 입력은 기본값 1이라
  보통은 날짜 하나만 고르면 끝. "반차" 버튼은 일수를 0.5로, 종료일을 시작일과 같게 한 번에
  맞춰준다. 휴가가 없는 팀원은 아무 입력도 필요 없다(행이 비어 있으면 그대로 저장 대상에서
  빠짐) — 보통 10명 중 1~2명만 휴가가 있는 현실을 반영해 실제 클릭 수를 줄이는 쪽이 "10명×1분"
  요구를 만족하는 핵심이라고 판단함(고정 10칸 표를 전부 채우게 하는 설계는 선택하지 않음).
- **RHF 구현 주의사항(다음에 참고)**: 시작일 입력에 커스텀 `onChange`(종료일 자동 채움)가
  필요해서 처음엔 `useFieldArray`의 `fields[index].starts_on`을 controlled `value`로 직접
  바인딩했다가, `setValue`가 `fields` 스냅샷을 갱신하지 않아 화면이 안 바뀌는 걸 코드 리뷰
  중 알아채고 수정함 — `register(...,{onChange})` + 다른 필드는 `setValue`로 갱신하는
  일반적인 RHF uncontrolled 패턴으로 바꿈(두 필드 다 `register`로 바인딩돼 있어야
  `setValue`가 DOM에 바로 반영됨). **이후 세션에서 필드 배열 안에 파생 입력을 만들 때 같은
  함정 주의.**
- **네비게이션**: `LeadLayout`에 "휴가" 탭 추가, `/app/leaves` 라우트 추가(팀 코드 없는
  계정엔 탭·라우트 둘 다 숨김, AS13과 동일한 가드).
- **검증(로컬, curl만)**: `npm run build` 성공, `GET .../leaves?month=`가 미인증 상태에서
  401로 다른 `/api/assign/*` 경로와 일관됨. **실제 로그인 후 10명 분량 입력이 실제로 1분 안에
  끝나는지, 반차/자동 채움이 기대대로 동작하는지는 라이브로 확인 못함** — 사용자 확인 필요.
- **하지 않은 것**: 그룹웨어 연동은 범위 밖(CLAUDE.md §11, API 없음) — 팀장이 그룹웨어 화면을
  보고 수동으로 입력하는 걸 전제로 한다. 월을 넘기는 휴가를 양쪽 달 화면에서 각각 수정할 때의
  상호 영향(AS3에 이미 기록된 알려진 단순화)은 화면에서 별도로 경고하지 않음.
