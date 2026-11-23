import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

// 팀장·관리자 화면(LeadApp)과 팀원 확인 화면(ConfirmPage)을 서로 다른 청크로 분리한다.
// 팀원은 비상주·겸직 인력이 휴대폰으로 /c/:token만 열며(CLAUDE.md §5.4, 목표 2초 이내 첫
// 화면), react-hook-form·zod·TanStack Query·docx 등 팀장 쪽 의존성을 내려받을 이유가 없다.
const LeadApp = lazy(() => import('./LeadApp'));
const ConfirmPage = lazy(() => import('../pages/confirm/ConfirmPage'));

export default function App() {
	return (
		<BrowserRouter>
			<Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
				<Routes>
					<Route path="/" element={<Navigate to="/app" replace />} />
					<Route path="/app/*" element={<LeadApp />} />
					<Route path="/c/:token" element={<ConfirmPage />} />
				</Routes>
			</Suspense>
		</BrowserRouter>
	);
}
