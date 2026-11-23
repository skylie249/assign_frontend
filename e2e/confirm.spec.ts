import { expect, test, type Page } from '@playwright/test';

const TOKEN = 'e2e-token';

// 백엔드 없이 GET/POST /api/assign/c/:token 응답을 스텁한다. `submitted`를 닫힘 변수로 들고
// 있어 제출(POST) 후 같은 테스트 안에서 GET이 "이미 제출됨" 응답으로 자연스럽게 바뀐다
// (실제 화면이 제출 성공 후 다시 GET을 호출하는 동작을 그대로 반영).
async function mockConfirmApi(page: Page, initiallySubmitted: boolean) {
	let submitted = initiallySubmitted;
	await page.route(`**/api/assign/c/${TOKEN}`, async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					memail: 'member@example.com',
					mname: '김호균',
					period_start: '2026-11-16',
					period_end: '2026-11-22',
					assignments: [
						{ job_id: 'D26-BA1002', job_name: '아모레 AI Blink 고도화', role_name: 'PM', ratio: 70 }
					],
					existing_confirmation: submitted
						? { status: 'confirmed', note: null, submitted_at: '2026-11-16T10:00:00+09:00' }
						: null
				})
			});
		} else {
			submitted = true;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ result: 'SUCCESS' })
			});
		}
	});
}

test('첫 방문: 스크롤 없이 배정대로 진행 버튼이 보이고 탭 한 번에 제출된다', async ({ page }) => {
	await mockConfirmApi(page, false);
	await page.goto(`/c/${TOKEN}`);

	const confirmButton = page.getByRole('button', { name: '배정대로 진행' });
	await expect(confirmButton).toBeVisible();

	// 375×812 뷰포트 안에 버튼 하단이 들어와야 한다(스크롤 없이 보임, CLAUDE.md §10).
	const box = await confirmButton.boundingBox();
	expect(box).not.toBeNull();
	expect(box!.y + box!.height).toBeLessThanOrEqual(812);

	await confirmButton.tap();
	await expect(page.getByText('배정대로 진행하기로 확인했습니다.')).toBeVisible();
});

test('재방문: 이미 제출한 내용과 수정 버튼이 보인다', async ({ page }) => {
	await mockConfirmApi(page, true);
	await page.goto(`/c/${TOKEN}`);

	await expect(page.getByText('배정대로 진행하기로 확인했습니다.')).toBeVisible();
	await expect(page.getByRole('button', { name: '수정' })).toBeVisible();
});

test('링크가 무효하면 같은 안내만 보인다', async ({ page }) => {
	await page.route(`**/api/assign/c/invalid-token`, async (route) => {
		await route.fulfill({
			status: 404,
			contentType: 'application/json',
			body: JSON.stringify({ result: 'unavailable', message: '링크를 사용할 수 없습니다. 팀장에게 새 링크를 요청해 주세요.' })
		});
	});
	await page.goto('/c/invalid-token');
	await expect(page.getByText('링크를 사용할 수 없습니다. 팀장에게 새 링크를 요청해 주세요.')).toBeVisible();
});
