import { QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { api, SessionOutError } from '../api/client';
import { queryClient } from '../api/queryClient';
import LoginPage from '../pages/lead/LoginPage';
import DashboardPage from '../pages/lead/DashboardPage';
import AssignmentsPage from '../pages/lead/AssignmentsPage';
import LeavesPage from '../pages/lead/LeavesPage';
import IssuesPage from '../pages/lead/IssuesPage';
import LinksPage from '../pages/lead/LinksPage';
import MonthClosePage from '../pages/lead/MonthClosePage';
import LeadLayout from './LeadLayout';

// TanStack Query는 팀장·관리자 화면에서만 쓴다 — 여기서 Provider를 두면 이 모듈이 지연
// 로드(App.tsx의 React.lazy)될 때만 react-query가 함께 불려온다. 팀원 확인 화면(/c/:token,
// AS17)은 이 모듈을 전혀 안 거치므로 그 무거운 의존성을 내려받지 않는다(완료 기준 "느린
// 회선에서 2초 이내").
export default function LeadApp() {
	return (
		<QueryClientProvider client={queryClient}>
			<LeadAppInner />
		</QueryClientProvider>
	);
}

// 로그인 게이트. weekreport.nexalab.app과 쿠키 도메인이 달라 세션을 공유하지 않으므로,
// 여기서 한 번 더 로그인한다(기존 /api/auth/login 재사용, 새 비밀번호 체계 없음).
function LeadAppInner() {
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
						<Route path="issues" element={<IssuesPage team={me.team_code} />} />
						<Route path="links" element={<LinksPage team={me.team_code} />} />
						<Route path="month-close" element={<MonthClosePage team={me.team_code} />} />
					</>
				)}
			</Route>
		</Routes>
	);
}
