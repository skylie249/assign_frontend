// 백엔드(weekreport_register)는 세션 쿠키로 로그인 상태를 유지하므로 모든 요청에
// credentials: 'include'가 필요하다. weekreport.nexalab.app과 도메인이 달라 세션 쿠키는
// 공유되지 않는다 — assign.nexalab.app에서 별도로 로그인해야 한다.
export class SessionOutError extends Error {
	constructor() {
		super('세션이 만료되었습니다. 다시 로그인해주세요.');
	}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const res = await fetch(path, {
		credentials: 'include',
		headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
		...options
	});

	if (res.status === 401) {
		throw new SessionOutError();
	}
	if (!res.ok) {
		throw new Error('HTTP ' + res.status + ' ' + (await res.text().catch(() => '')));
	}
	return res.json();
}

export interface AssignMe {
	memail: string;
	mname: string;
	role: 'admin' | 'team_lead' | 'deputy' | null;
	team_code: string | null;
}

export interface LoginResult {
	result: 'success' | 'wrongMid' | 'wrongMpassword' | 'locked';
	member?: { memail: string; mname: string };
}

export const api = {
	login: (memail: string, mpassword: string) =>
		request<LoginResult>('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ memail, mpassword })
		}),
	logout: () => request<{ result: string }>('/api/auth/logout', { method: 'POST' }),
	getMe: () => request<AssignMe>('/api/assign/me')
};
