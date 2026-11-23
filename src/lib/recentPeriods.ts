import type { Period } from '../api/client';

// 백엔드에 확인 기간 목록 조회 API가 없어(생성 시점에만 id를 돌려줌), 브라우저에 최근 만든
// 기간을 기록해 다시 찾을 수 있게 한다. 팀별로 최근 10개만 보관.
const KEY_PREFIX = 'assign.recentPeriods.';
const MAX_ITEMS = 10;

function key(team: string) {
	return KEY_PREFIX + team;
}

export function loadRecentPeriods(team: string): Period[] {
	try {
		const raw = localStorage.getItem(key(team));
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveRecentPeriod(team: string, period: Period) {
	const existing = loadRecentPeriods(team).filter((p) => p.id !== period.id);
	const next = [period, ...existing].slice(0, MAX_ITEMS);
	try {
		localStorage.setItem(key(team), JSON.stringify(next));
	} catch {
		// localStorage 사용 불가(사생활 보호 모드 등)면 조용히 무시 — 이번 세션 안에서 쓴 기간은
		// 화면 상태로 여전히 동작하고, 새로고침하면 목록에서만 사라진다.
	}
}
