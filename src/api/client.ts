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

export interface LeaveRow {
	id?: number;
	memail: string;
	mname?: string;
	starts_on: string;
	ends_on: string;
	days: number;
	source?: 'groupware_approved' | 'member_reported';
}

export interface LeavesResponse {
	team_code: string;
	month: string;
	leaves: LeaveRow[];
}

export interface SaveLeavesResult {
	result: 'SUCCESS' | 'invalid';
	message?: string;
}

export type IssueStatus = 'normal' | 'caution' | 'risk';

export interface Issue {
	id: number;
	job_id: string;
	job_name: string | null;
	week_start: string;
	status: IssueStatus;
	issue: string | null;
	action: string | null;
	due_on: string | null;
	resolved_at: string | null;
	created_by: string;
	created_at: string;
}

export interface CreateIssueBody {
	job_id: string;
	week_start: string;
	status: IssueStatus;
	issue: string;
	action: string;
	due_on: string | null;
}

export interface UpdateIssueBody {
	status?: IssueStatus;
	issue?: string;
	action?: string;
	due_on?: string | null;
	resolved?: boolean;
}

export interface SaveIssueResult {
	result: 'SUCCESS' | 'invalid' | 'not_found';
	id?: number;
	message?: string;
}

export interface Period {
	id: number;
	team_code: string;
	period_start: string;
	period_end: string;
	opens_at: string;
	closes_at: string;
}

export interface CreatePeriodBody {
	period_start: string;
	period_end: string;
	opens_at?: string;
	closes_at?: string;
}

export type CreatePeriodResult = Period | { result: 'invalid'; message: string };

export interface IssueTokenResult {
	memail: string;
	token?: string;
	expires_at?: string;
	error?: string;
}

export interface ReissueTokenResult {
	token: string;
	expires_at: string;
}

export type ConfirmationStatus = 'confirmed' | 'changed' | 'auto_assumed';

export interface PeriodStatusMember {
	memail: string;
	mname: string;
	token_id: number;
	confirmation_id: number | null;
	status: ConfirmationStatus | null;
	submitted_at: string | null;
	note: string | null;
	changes_json: string | null;
	needs_review: boolean;
}

export interface PeriodStatusSummary {
	issued: number;
	confirmed: number;
	changed: number;
	auto_assumed: number;
	no_response: number;
	pending_review: number;
}

export interface PeriodStatusResponse {
	period: Period;
	summary: PeriodStatusSummary;
	members: PeriodStatusMember[];
}

export interface ReviewConfirmationResult {
	result: 'SUCCESS' | 'not_found' | 'invalid' | 'forbidden';
	action?: 'apply' | 'ignore';
	applied_count?: number;
	message?: string;
}

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
		),

	getLeaves: (team: string, month: string) =>
		request<LeavesResponse>('/api/assign/teams/' + encodeURIComponent(team) + '/leaves?month=' + month),
	saveLeaves: (team: string, month: string, rows: Omit<LeaveRow, 'id' | 'mname'>[]) =>
		request<SaveLeavesResult>(
			'/api/assign/teams/' + encodeURIComponent(team) + '/leaves?month=' + month,
			{ method: 'PUT', body: JSON.stringify({ leaves: rows }) }
		),

	getIssues: (team: string, week: string) =>
		request<{ issues: Issue[] }>('/api/assign/teams/' + encodeURIComponent(team) + '/issues?week=' + week),
	createIssue: (team: string, body: CreateIssueBody) =>
		request<SaveIssueResult>('/api/assign/teams/' + encodeURIComponent(team) + '/issues', {
			method: 'POST',
			body: JSON.stringify(body)
		}),
	updateIssue: (team: string, id: number, body: UpdateIssueBody) =>
		request<SaveIssueResult>(
			'/api/assign/teams/' + encodeURIComponent(team) + '/issues/' + id,
			{ method: 'PATCH', body: JSON.stringify(body) }
		),

	createPeriod: (team: string, body: CreatePeriodBody) =>
		request<CreatePeriodResult>('/api/assign/teams/' + encodeURIComponent(team) + '/periods', {
			method: 'POST',
			body: JSON.stringify(body)
		}),
	issueTokens: (periodId: number, memails: string[]) =>
		request<{ results: IssueTokenResult[] }>('/api/assign/periods/' + periodId + '/tokens', {
			method: 'POST',
			body: JSON.stringify({ memails })
		}),
	reissueToken: (tokenId: number) =>
		request<ReissueTokenResult>('/api/assign/tokens/' + tokenId + '/reissue', { method: 'POST' }),
	getPeriodStatus: (periodId: number) =>
		request<PeriodStatusResponse>('/api/assign/periods/' + periodId + '/status'),
	reviewConfirmation: (confirmationId: number, action: 'apply' | 'ignore') =>
		request<ReviewConfirmationResult>('/api/assign/confirmations/' + confirmationId + '/review', {
			method: 'POST',
			body: JSON.stringify({ action })
		})
};
