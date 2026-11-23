import { expect, test } from '@playwright/test';

// CLAUDE.md §10 완료 기준: "다른 팀 데이터 접근, 만료·무효 토큰 응답을 막는 테스트가 있다."
// 이 테스트는 로컬 Java 백엔드(기본 8879, vite dev 프록시를 통해 4173에서 접근)가 실제로
// 떠 있어야 한다 — 가짜 응답을 스텁하지 않고 실제 서버에 요청한다.
//
// "다른 팀 접근 차단"은 실제 로그인 세션(팀장 계정)이 있어야만 의미 있게 테스트할 수 있어
// 여기서는 다루지 않는다 — AssignApiController의 모든 팀 스코프 엔드포인트가 예외 없이
// hasTeamScope()/isAdmin()을 거치는 것은 정적 코드 감사로 확인했고(2026-11-23, PROGRESS.md
// "AS19에서 한 일" 참고), 실제 403 응답은 AS1에서 사용자가 실제 계정으로 라이브 검증했다.
test.describe('로그인 없이는 팀 스코프 API에 접근할 수 없다 (401 일관성)', () => {
	const protectedPaths = [
		'/api/assign/me',
		'/api/assign/teams/200022/members',
		'/api/assign/teams/200022/assignments?month=2026-11',
		'/api/assign/teams/200022/leaves?month=2026-11',
		'/api/assign/teams/200022/issues?week=2026-11-16',
		'/api/assign/periods/1/status'
	];

	for (const path of protectedPaths) {
		test(`GET ${path} → 401 sessionout`, async ({ request }) => {
			const res = await request.get(path);
			expect(res.status()).toBe(401);
			const body = await res.json();
			expect(body.result).toBe('sessionout');
		});
	}
});

test.describe('팀원 확인 토큰(/c/:token) — 무효·형식 오류는 전부 같은 응답', () => {
	const invalidTokens = [
		'this-token-does-not-exist-at-all',
		'not-even-base64url!!',
		'a',
		encodeURIComponent('weird token with spaces')
	];

	for (const token of invalidTokens) {
		test(`GET /c/${token} → 404 unavailable`, async ({ request }) => {
			const res = await request.get(`/api/assign/c/${token}`);
			expect(res.status()).toBe(404);
			const body = await res.json();
			expect(body.result).toBe('unavailable');
		});

		test(`POST /c/${token} → 404 unavailable (제출도 막힘)`, async ({ request }) => {
			const res = await request.post(`/api/assign/c/${token}`, {
				data: { status: 'confirmed' }
			});
			expect(res.status()).toBe(404);
			const body = await res.json();
			expect(body.result).toBe('unavailable');
		});
	}

	test('서로 다른 무효 토큰들의 응답 바디가 완전히 동일하다 (존재 여부를 흘리지 않음)', async ({ request }) => {
		const bodies = await Promise.all(
			invalidTokens.map(async (token) => {
				const res = await request.get(`/api/assign/c/${token}`);
				return JSON.stringify(await res.json());
			})
		);
		expect(new Set(bodies).size).toBe(1);
	});
});
