import { NavLink, Outlet } from 'react-router-dom';
import { api, type AssignMe } from '../api/client';

export default function LeadLayout({ me, onLoggedOut }: { me: AssignMe; onLoggedOut: () => void }) {
	const handleLogout = async () => {
		await api.logout();
		onLoggedOut();
	};

	const navItems = [
		{ to: '/app', label: '대시보드', end: true },
		...(me.team_code
			? [
					{ to: '/app/assignments', label: '배치표', end: false },
					{ to: '/app/leaves', label: '휴가', end: false },
					{ to: '/app/issues', label: '이슈', end: false },
					{ to: '/app/links', label: '확인 링크', end: false }
				]
			: [])
	];

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="border-b border-slate-200 bg-white px-4 py-3">
				<div className="mx-auto flex max-w-5xl items-center justify-between">
					<nav className="flex gap-4">
						{navItems.map((item) => (
							<NavLink
								key={item.to}
								to={item.to}
								end={item.end}
								className={({ isActive }) =>
									'text-sm font-medium ' + (isActive ? 'text-slate-900' : 'text-slate-400')
								}
							>
								{item.label}
							</NavLink>
						))}
					</nav>
					<div className="flex items-center gap-3 text-sm text-slate-500">
						<span>{me.mname}</span>
						<button onClick={handleLogout} className="underline">
							로그아웃
						</button>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-5xl px-4 py-6">
				<Outlet />
			</main>
		</div>
	);
}
