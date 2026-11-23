import { defineConfig, devices } from '@playwright/test';

// 팀원 확인 화면(/c/:token)의 모바일 E2E만 다룬다(CLAUDE.md §9 "375×812 뷰포트").
// 백엔드를 띄우지 않고 page.route로 /api/assign/c/:token 응답을 스텁한다 — 이 테스트는
// 화면 쪽 동작(스크롤 없이 버튼 노출, 탭 한 번 제출, 재방문 시 수정 버튼)만 검증한다.
export default defineConfig({
	testDir: './e2e',
	webServer: {
		command: 'npm run dev -- --port 4173',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI
	},
	use: {
		baseURL: 'http://localhost:4173',
		...devices['iPhone X'],
		// iPhone X 프리셋은 기본적으로 webkit을 쓰는데, 이 머신엔 chromium만 설치돼 있어
		// 뷰포트·터치 에뮬레이션은 그대로 두고 브라우저 엔진만 chromium으로 바꾼다.
		defaultBrowserType: 'chromium'
	}
});
