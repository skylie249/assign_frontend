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
	// 400(예: 배치표 저장 "invalid")도 JSON 바디(result/message)를 그대로 돌려주므로 파싱한다 —
	// 진짜 예외(5xx, 네트워크 오류 등 JSON이 아닌 응답)만 throw한다.
	const contentType = res.headers.get('content-type') ?? '';
	if (!res.ok && !contentType.includes('application/json')) {
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

export interface TeamMember {
	memail: string;
	mname: string;
	mposition: string;
	mposName: string;
	work_type: 'resident' | 'non_resident';
	standard_hours: number;
	joined_on: string | null;
	left_on: string | null;
}

export interface Project {
	job_id: string;
	job_name: string;
	job_order: number;
	category: 'B1' | 'B2' | 'B3' | 'U' | 'E' | null;
}

export interface AssignmentRow {
	id?: number;
	memail: string;
	mname?: string;
	job_id: string;
	job_name?: string;
	role_name: string | null;
	ratio: number;
}

export interface RatioWarning {
	memail: string;
	total_ratio: number;
}

export interface AssignmentsResponse {
	team_code: string;
	month: string;
	assignments: AssignmentRow[];
	warnings: RatioWarning[];
}

export interface SaveAssignmentsResult {
	result: 'SUCCESS' | 'invalid';
	warnings?: RatioWarning[];
	message?: string;
}

export type CopyPreviousResult =
	| { result: 'needs_confirm'; existing_count: number }
	| { result: 'no_source'; message: string }
	| { result: 'SUCCESS'; copied_count: number; warnings: RatioWarning[] };

export const api = {
	login: (memail: string, mpassword: string) =>
		request<LoginResult>('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ memail, mpassword })
		}),
	logout: () => request<{ result: string }>('/api/auth/logout', { method: 'POST' }),
	getMe: () => request<AssignMe>('/api/assign/me'),

	getTeamMembers: (team: string) =>
		request<{ team_code: string; members: TeamMember[] }>(
			'/api/assign/teams/' + encodeURIComponent(team) + '/members'
		),
	getProjects: (team: string) =>
		request<{ projects: Project[] }>('/api/assign/projects?team=' + encodeURIComponent(team)),
	getAssignments: (team: string, month: string) =>
		request<AssignmentsResponse>(
			'/api/assign/teams/' + encodeURIComponent(team) + '/assignments?month=' + month
		),
	saveAssignments: (team: string, month: string, rows: Omit<AssignmentRow, 'id' | 'mname' | 'job_name'>[]) =>
		request<SaveAssignmentsResult>(
			'/api/assign/teams/' + encodeURIComponent(team) + '/assignments?month=' + month,
			{ method: 'PUT', body: JSON.stringify({ assignments: rows }) }
		),
	copyPreviousAssignments: (team: string, month: string, overwrite: boolean) =>
		request<CopyPreviousResult>(
			'/api/assign/teams/' +
				encodeURIComponent(team) +
				'/assignments/copy-previous?month=' +
				month +
				'&overwrite=' +
				overwrite,
			{ method: 'POST' }
		)
};
