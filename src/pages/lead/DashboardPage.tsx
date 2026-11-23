import { api, type AssignMe } from '../../api/client';

const ROLE_LABELS: Record<string, string> = {
	admin: '관리자',
	team_lead: '팀장',
	deputy: '부담당'
};

export default function DashboardPage({ me, onLoggedOut }: { me: AssignMe; onLoggedOut: () => void }) {
	const handleLogout = async () => {
		await api.logout();
		onLoggedOut();
	};

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6">
			<div className="mx-auto max-w-2xl space-y-4">
				<div className="flex items-center justify-between">
					<h1 className="text-lg font-semibold text-slate-900">배치표·확인</h1>
					<button onClick={handleLogout} className="text-sm text-slate-500 underline">
						로그아웃
					</button>
				</div>
				<div className="rounded-xl bg-white p-4 shadow-sm">
					<p className="text-sm text-slate-500">로그인 계정</p>
					<p className="text-base font-medium text-slate-900">
						{me.mname} ({me.memail})
					</p>
					<p className="mt-2 text-sm text-slate-500">
						역할: {me.role ? ROLE_LABELS[me.role] ?? me.role : '미지정'} · 팀:{' '}
						{me.team_code ?? '-'}
					</p>
				</div>
				{!me.role && (
					<p className="text-sm text-amber-600">
						이 계정에는 아직 배치표·확인 앱 역할이 지정되어 있지 않습니다. 관리자에게 문의하세요.
					</p>
				)}
			</div>
		</div>
	);
}
