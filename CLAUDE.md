# CLAUDE.md — 배치표·확인 앱 (assign)

이 문서는 `weekreport` 폴더(루트)에 두고, 그 안에서 **배치표·확인 앱(assign)**을 만들 때 따르는 지침이다.
팀장이 배치표를 만들고 관리하고, 팀원은 모바일 링크로 **"확인"만** 한다. Google Forms·MS Forms·네이버폼 같은 모바일 폼 링크를 대체한다.

> 루트에 이미 `CLAUDE.md`가 있다면 덮어쓰지 말고, 이 문서를 그 파일의 한 절로 합치거나 `assign_frontend/CLAUDE.md`로 두고 루트 문서에서 링크한다. 기존 원칙과 충돌하면 기존 원칙이 우선이며, 충돌 내용을 먼저 보고한다.

---

## 0. 폴더와 역할

| 폴더 | 정체 | 이번 작업에서 |
|---|---|---|
| `weekreport_frontend/` | weekreport.nexalab.app 화면 (Vercel · React) | **수정하지 않는다** |
| `weekreport_register/` | 백엔드 (Java 17 · Spring MVC · MyBatis · Tomcat 8879, 화면 없음) | **assign API를 추가한다** |
| `wr-agent-platform/` (Python) | 폴링 동기화 · 월간 Billable 엑셀 · 스케줄러 | **배치 기반 집계를 추가한다** |
| `assign_frontend/` | 배치표·확인 앱 화면 (신규, React) | **새로 만든다** |

실제 폴더 이름이 다르면 실제 이름을 따른다. 세 폴더의 기존 코드 규칙(패키지 구조, 네이밍, 빌드 방식)을 먼저 읽고 그대로 맞춘다.

## 1. 도메인과 배포

| 구분 | 주소 | 비고 |
|---|---|---|
| 앱 화면 | **`assign.nexalab.app`** | Vercel 배포. 팀장 화면 `/app/*`, 팀원 확인 `/c/:token` |
| API | 기존 터널 `weekreport-api.nexalab.app` | `weekreport_register`에 `/api/assign/*` 경로로 추가 |

- 화면의 `/api/*` 요청은 weekreport와 같은 방식으로 **Vercel이 터널로 전달**한다(`vercel.json` rewrite 또는 Vercel 함수). 브라우저 입장에서는 같은 출처라 CORS 설정이 필요 없다. 비밀값은 Vercel에 두지 않는다.
- 팀원 링크는 메신저로 공유하므로 짧아야 한다: `https://assign.nexalab.app/c/<토큰>`.
- Cloudflare Access(회사 메일 도메인 OTP)를 적용할 때는 `/api/assign/c/*`(팀원 확인)만 예외로 두고, 그 경로는 서명 토큰으로 보호한다.

## 2. 왜 만드는가

- 경영팀 보고 지표(Billable / Util / 기타, 팀장 포함·제외)의 원천은 **사람 × 월 × 프로젝트 × 투입 비율** 하나다.
- 상주 인력의 투입률은 계약·배치로 이미 정해져 있고, 시간 실적은 고객 청구·정산에 쓰이지 않는다.
- 그래서 근로자의 시간을 입력받지 않고, **팀장의 배치표 + 예외(휴가·철수·추가 투입·겸직)**로 관리한다.
- 상주 근로자는 사내 웹·회사 메일 접근이 어렵고 휴대폰만 쓸 수 있다. 근무시간 외 작성 문제가 있었다.

## 3. 절대 원칙 (어기지 말 것)

1. **근로자의 시간을 입력받지 않는다.** 팀원 화면은 "배정대로 진행 / 달라짐" 선택이 전부다.
2. **상주 근로자는 입력 대상이 아니다.** 확인 링크는 `비상주·겸직` 인력에게만 발급한다.
3. **고객사 정보를 입력받지 않는다.** 업무 내용·시스템명·고객사 내부 정보 입력란을 만들지 않는다. 자유 입력은 "특이사항" 한 줄(100자)뿐이다.
4. **사내 MariaDB의 기존 테이블(`report_*`, `member`, `report_job` 등)은 읽기만 한다.** 기존 저장·제출 경로도 이 앱에서 호출하지 않는다. 새 데이터는 `weekreport_register`가 소유하는 **`wr_assign_*` 테이블에만** 쓴다.
5. **Python 플랫폼은 MariaDB를 읽기 전용으로만 접근한다**(기존 원칙 유지). `wr_assign_*`도 읽기만 한다. 쓰기는 반드시 `weekreport_register` API를 거친다.
6. **인사 평가성 정보를 저장하지 않는다.** 이슈 기록은 프로젝트 상태만 다룬다.
7. **근무시간 외 응답을 유도하지 않는다.** 응답 기간과 마감은 근무시간 안으로 두고, 화면에 "근무시간 안에서 응답해 주세요"를 표시한다. 팀장 보고도 같다.
8. **외부 AI 호출을 넣지 않는다.** 이 앱의 어떤 기능도 보고 내용을 외부 AI 서비스로 보내지 않는다.
9. **비밀값을 커밋하지 않는다.** 토큰 서명 키 등은 환경변수로만 둔다. `.env.example`만 커밋한다.

## 4. 사용자와 권한

| 역할 | 접근 방식 | 할 수 있는 것 |
|---|---|---|
| `admin` (본부 집계 정·부 담당) | 로그인 | 전 팀 조회, 월간 집계·엑셀, 프로젝트 분류(B1/B2/B3/U/E) 관리 |
| `team_lead` (팀장·PM) | 로그인 | 자기 팀 배치표·휴가 예외·이슈 관리, 확인 링크 발급, 확인 현황 조회 |
| `deputy` (팀 부 담당) | 로그인 | `team_lead`와 같은 권한으로 대리 등록 (상주 팀장 지원) |
| `member` (비상주·겸직 팀원) | **로그인 없음, 개인 서명 링크** | 자기 배정 확인과 "달라짐" 응답만 |

- 로그인은 `weekreport_register`의 기존 로그인·세션·잠금·Origin 검사를 그대로 쓴다. 새 비밀번호 체계를 만들지 않는다.
- 역할은 `wr_assign_role`(아래)로 관리한다. 기본값: `member` 테이블의 팀장 표시가 있으면 `team_lead`.
- 모든 조회 API는 **자기 팀 범위**로 제한한다. 다른 팀 데이터가 보이면 버그다.

## 5. 핵심 흐름

```
팀장(PM) ──배치표 생성·변동 시 수정──▶ wr_assign_* (MariaDB, register 소유)
   │                                      │
   ├─ 월말: 그룹웨어 승인 휴가 예외 등록    ├─▶ 수요일: 이슈 + 배치 → 워드 → 본부장
   │                                      └─▶ 월초: Python이 읽어서 집계 → 엑셀 → 경영팀
   └─ 확인 링크 발급·공유 ──▶ 비상주·겸직 팀원 ──주 1회 확인──▶ register API
```

### 5.1 팀장: 배치표
- 배치 = (구성원, 프로젝트, 역할, 투입률 %, 시작일, 종료일).
- 한 사람의 같은 기간 투입률 합계는 **100%**여야 한다. 벗어나면 저장 전에 경고한다(저장은 막지 않는다).
- **"지난달과 동일하게"** 버튼: 지난달 배치를 이번 달로 복제한다. 변동 없는 달은 이 버튼 하나로 끝나야 한다.
- 구성원·프로젝트는 기존 `member`, `report_job`을 읽어서 쓴다(job_id 기준). 별도 마스터를 복사해 두지 않는다.
- 프로젝트 분류(B1/B2/B3/U/E)는 `admin`이 `wr_assign_project_category`에 한 번 지정한다.

### 5.2 팀장: 휴가 예외
- 휴가는 팀장이 그룹웨어에서 승인하므로 팀장이 이미 안다. 그룹웨어 연동 API는 없다.
- **월말 일괄 입력 화면**: 구성원별 이번 달 휴가 일수(반차 0.5)와 기간을 한 화면에서 입력한다.
- 휴가는 **Billable(B3)**이다. 휴가 일수만큼 해당 월 배치 비율을 B3(휴가)로 재분류하며 Billable 합계는 바뀌지 않는다.

### 5.3 팀장: 이슈 (수요일 본부장 보고)
- 프로젝트별 상태(`정상 / 주의 / 위험`), 이슈(2줄 이내), 조치·결정(누가, 언제까지), 추적 기한.
- 추적 기한이 지난 미해결 이슈는 대시보드 맨 위에 표시한다.
- **워드 다운로드**: 이번 주 이슈 + 프로젝트별 배치를 .docx로 만든다(`assign_frontend`에서 `docx` 라이브러리).

### 5.4 팀원: 모바일 확인 (핵심 화면, 목표 30초)
1. 팀장이 공유한 링크(`/c/:token`)를 휴대폰으로 연다. 로그인 없음.
2. 이번 주 내 배정이 카드로 보인다. 예: `아모레 AI Blink 고도화 · 70%`.
3. **[배정대로 진행]** → 제출 완료.
4. **[달라짐]** → 선택지만: 휴가·부재(일수) / 추가 업무(프로젝트 + 대략 비율) / 비율 변경 / 기타 / 특이사항 한 줄(선택, 100자).
5. 같은 기간에 다시 열면 제출 내용과 "수정" 버튼을 보여 준다.

규칙:
- 응답 기간은 설정값(기본: 금요일 09:00 ~ 다음 월요일 18:00). 기간 밖에는 안내만 보여 준다.
- 마감까지 응답이 없으면 **"배정대로 진행"으로 자동 간주**(`auto_assumed`). 팀장은 간주 건을 구분해 보고 보정할 수 있다.
- "달라짐" 응답은 배치표를 바로 바꾸지 않는다. 팀장 대시보드의 **검토 대기**로 가고, 팀장이 반영하거나 무시한다.

### 5.5 상주 팀장 지원
- 팀장 화면은 데스크톱·휴대폰 모두 지원한다. **월말 확인**은 모바일 우선이다.
- 월말 확인: "지난달 배치 + 이번 달 승인 휴가" 초안을 보여 주고 **[확인]** 한 번으로 확정한다.
- `deputy`가 같은 작업을 대리로 할 수 있다. 대리 작업은 감사 로그에 남긴다.

### 5.6 확인 링크 발급·공유
- 링크는 **구성원 1명 × 확인 기간 1개**에 묶인 서명 토큰이다(무작위 32바이트, DB에는 SHA-256 해시만 저장).
- 팀장 화면에서 대상자 링크를 한 번에 만들고 **복사** 또는 **공유**(Web Share API → 메신저·문자 앱)한다. 앱이 직접 문자·메일을 보내지 않는다.
- 재발급하면 이전 토큰은 즉시 무효가 된다.

## 6. 데이터 모델 (MariaDB, `weekreport_register` 소유)

DDL은 `weekreport_register`의 기존 마이그레이션·스키마 관리 방식에 맞춰 추가한다. 기존 테이블은 변경하지 않는다.

| 테이블 | 주요 컬럼 |
|---|---|
| `wr_assign_role` | member_seq, role(`admin`/`team_lead`/`deputy`), team_code |
| `wr_assign_member_ext` | member_seq, work_type(`resident`/`non_resident`), standard_hours(기본 40), joined_on, left_on |
| `wr_assign_project_category` | job_id, category(`B1`/`B2`/`B3`/`U`/`E`), updated_by |
| `wr_assign_assignment` | id, member_seq, job_id, role_name, ratio(0~100), starts_on, ends_on, created_by, updated_at |
| `wr_assign_leave` | id, member_seq, starts_on, ends_on, days, source(`groupware_approved`), registered_by, created_at |
| `wr_assign_period` | id, team_code, period_start, period_end, opens_at, closes_at |
| `wr_assign_token` | id, period_id, member_seq, token_hash, expires_at, revoked_at |
| `wr_assign_confirmation` | id, period_id, member_seq, status(`confirmed`/`changed`/`auto_assumed`), changes_json, note(≤100자), submitted_at, reviewed_by, reviewed_at |
| `wr_assign_issue` | id, job_id, week_start, status(`normal`/`caution`/`risk`), issue, action, due_on, resolved_at, created_by |
| `wr_assign_month_close` | team_code, month, closed_by, closed_at |

- 감사 기록은 기존 `wr_audit_log`에 남긴다(새 감사 테이블을 만들지 않는다).
- 연락처는 저장하지 않는다.
- 미응답 자동 간주는 `weekreport_register`의 기존 작업 스케줄러에서 마감 시각에 처리한다.

## 7. 백엔드 (`weekreport_register`)

- 기존 구조(controller → service → MyBatis mapper XML)를 그대로 따른다. 새 패키지 예: `...assign`.
- 경로 접두어 `/api/assign/*`. 기존 `/api/*` 경로와 겹치지 않게 한다.
- 팀장·관리자 API: 기존 로그인 세션 필수 + 역할·팀 범위 검사.
- 팀원 API(`/api/assign/c/*`): 세션 없이 토큰만. 토큰 검증 실패, 만료, 무효, 응답 기간 밖은 모두 같은 형태의 오류로 응답한다(존재 여부를 흘리지 않음). IP 기준 요청 제한을 둔다(`CF-Connecting-IP` 기준).
- 쓰기는 트랜잭션으로 묶고, 쓸 때마다 `wr_audit_log`에 남긴다.

### API 계약
모든 응답은 JSON. 날짜 `YYYY-MM-DD`, 시각 ISO 8601(+09:00).

팀장·관리자 (세션):
- `GET  /api/assign/me` → 역할, 팀
- `GET  /api/assign/teams/:team/members` · `GET /api/assign/projects?team=`
- `GET  /api/assign/teams/:team/assignments?month=YYYY-MM`
- `PUT  /api/assign/teams/:team/assignments?month=YYYY-MM` (전체 저장)
- `POST /api/assign/teams/:team/assignments/copy-previous?month=YYYY-MM`
- `GET|PUT /api/assign/teams/:team/leaves?month=YYYY-MM`
- `GET|POST|PATCH /api/assign/teams/:team/issues?week=YYYY-MM-DD`
- `POST /api/assign/teams/:team/periods` · `POST /api/assign/periods/:id/tokens` · `POST /api/assign/tokens/:id/reissue`
- `GET  /api/assign/periods/:id/status` (응답·미응답·간주·검토 대기)
- `POST /api/assign/confirmations/:id/review` (반영 / 무시)
- `POST /api/assign/teams/:team/month-close?month=YYYY-MM`
- `PUT  /api/assign/projects/:jobId/category` (admin)
- `GET  /api/assign/reports/monthly?month=YYYY-MM&scope=team|division` · `GET /api/assign/reports/monthly.xlsx?...` (Python이 만든 결과를 전달)

팀원 (토큰):
- `GET  /api/assign/c/:token` → 이름, 기간, 배정 카드, 기존 응답, 응답 가능 여부
- `POST /api/assign/c/:token` → `{ "status": "confirmed" }` 또는 `{ "status": "changed", "changes": [...], "note": "..." }`

## 8. 집계 (`wr-agent-platform`)

기존 월간 Billable 엑셀 작업 옆에 **배치 기반 집계**를 추가한다. `wr_assign_*`와 `member`, `report_job`을 읽기 전용으로 읽는다. 규칙은 `docs/BILLABLE_RULES.md`에 적고 테스트로 고정한다.

- 사람별 한 달 = 1.00. 배치 비율을 분류별로 합산한다.
- **Billable = B1 + B2 + B3**, Util = U, 기타 = E. 휴가는 B3(Billable).
- 인원 = 해당 월에 재직 기간이 겹치는 구성원 수. 월 중 입·퇴사는 평일 비율로 보정.
- 팀장 포함·팀장 제외 두 버전. 팀장도 배치표에 등록(없으면 "사업 및 조직 관리" 100% 기본값).
- 분기·반기·연간 평균은 **실적이 있는 달만** 평균한다.
- 개인 기준 근무시간(단축근무 등)은 `standard_hours`로 환산한다.
- 출력 형식은 기존 경영팀 엑셀(본부 요약, 팀별, 월·분기·반기·연간)을 그대로 따른다.
- **병행 운영 기간에는 기존(시간 실적) 집계와 배치 기반 집계를 나란히 내고, 팀별 차이를 대조표로 함께 만든다.**

## 9. 화면 (`assign_frontend`)

- React 18 + TypeScript + Vite, React Router (`/app/*` 팀장, `/c/:token` 팀원)
- TanStack Query, react-hook-form + zod, Tailwind CSS
- **모바일 우선**: 기준 폭 375px, 터치 영역 최소 44px
- date-fns (주차·평일 계산, 타임존 `Asia/Seoul`), docx (워드)
- 테스트: Vitest + Testing Library, Playwright(375×812 뷰포트로 팀원 확인 E2E)
- `weekreport_frontend`의 공용 코드를 가져다 쓰려면 복사하지 말고, 필요하면 무엇을 공유할지 먼저 제안한다.

```
assign_frontend/src/
  app/        # 라우터, 레이아웃, 인증 가드
  pages/lead/ # 대시보드, 배치표, 휴가, 이슈, 링크, 월간 집계
  pages/confirm/  # 팀원 모바일 확인
  features/   # assignment, leave, issue, confirm, report
  api/        # API 클라이언트, zod 스키마
  lib/        # 날짜·주차·권한 유틸
```

## 10. 완료 기준

- 팀원 확인: 375px에서 스크롤 없이 [배정대로 진행]이 보이고 탭 한 번에 제출된다. 느린 회선에서 첫 화면 2초 이내.
- 배치표: 10명 × 5개 프로젝트를 한 화면에서 편집, 1인 합계 100% 검증이 실시간으로 보인다.
- 휴가 일괄 입력: 팀원 10명의 한 달 휴가를 1분 안에 입력.
- 월말 확인(모바일): 초안 확인 → [확인] 한 번.
- 워드 다운로드: 이번 주 이슈와 배치가 한 파일로 나온다.
- 집계: 같은 달에 대해 기존 집계와 배치 기반 집계의 팀 투입률 대조표가 나온다.
- 권한: 다른 팀 데이터 접근, 만료·무효 토큰 응답을 막는 테스트가 있다.

## 11. 하지 않는 것

- `weekreport_frontend` 수정, MariaDB 기존 테이블 쓰기, 기존 저장·제출 경로 호출
- 근로자의 업무별 시간 입력, 업무 상세 기록
- 문자·메일 직접 발송, 푸시 알림 서버
- 외부 AI 호출, 개인 평가 기록
- 그룹웨어 연동 (API 없음. 휴가는 팀장이 입력)

## 12. 작업 방식

- 세 폴더를 함께 바꾸는 작업은 백엔드(DDL·API) → Python 집계 → 화면 순서로 진행하고, 단계마다 동작을 확인한다.
- 커밋 메시지는 한국어로 무엇을 왜 바꿨는지 쓴다.
- 집계 규칙이나 권한 범위를 바꾸면 `docs/BILLABLE_RULES.md`와 테스트를 같이 고친다.
- 위 "절대 원칙"과 충돌하는 요청을 받으면 구현하기 전에 확인을 요청한다.

## 13. 미정 사항 (구현 전 확인)

- 응답 기간 기본값과 미응답 자동 간주 시각(금요일 09:00 ~ 다음 주 화요일 12:00, 자동 간주도 화요일 12:00)
- 팀원 확인 결과를 기존 주간보고(`report_*`)에 실적으로 반영할지 (기본: 반영하지 않음)
- 상시 실행 PC의 사내 보안 서버 이관 시점, 터널 사용에 대한 IT 공유
- `wr_assign_*` 테이블 추가에 대한 사내 DB 관리 측 확인 필요 여부
