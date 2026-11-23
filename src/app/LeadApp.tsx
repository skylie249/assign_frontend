import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { api, SessionOutError } from '../api/client';
import LoginPage from '../pages/lead/LoginPage';
import DashboardPage from '../pages/lead/DashboardPage';
import AssignmentsPage from '../pages/lead/AssignmentsPage';
import LeavesPage from '../pages/lead/LeavesPage';
import LeadLayout from './LeadLayout';

// 로그인 게이트. weekreport.nexalab.app과 쿠키 도메인이 달라 세션을 공유하지 않으므로,
// 여기서 한 번 더 로그인한다(기존 /api/auth/login 재사용, 새 비밀번호 체계 없음).
export default function LeadApp() {
	const queryClient = useQueryClient();
	const meQuery = useQuery({
		queryKey: ['assign', 'me'],
		queryFn: api.getMe
	});

	const refetchMe = () => queryClient.invalidateQueries({ queryKey: ['assign', 'me'] });

	if (meQuery.isError) {
		if (meQuery.error instanceof SessionOutError) {
			return <LoginPage onLoggedIn={refetchMe} />;
		}
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-sm text-red-600">
				서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.
			</div>
		);
	}

	if (!meQuery.data) {
		return <div className="min-h-screen bg-slate-50" />;
	}

	const me = meQuery.data;

	return (
		<Routes>
			<Route element={<LeadLayout me={me} onLoggedOut={refetchMe} />}>
				<Route index element={<DashboardPage me={me} />} />
				{me.team_code && (
					<>
						<Route path="assignments" element={<AssignmentsPage team={me.team_code} />} />
						<Route path="leaves" element={<LeavesPage team={me.team_code} />} />
					</>
				)}
			</Route>
		</Routes>
	);
}
