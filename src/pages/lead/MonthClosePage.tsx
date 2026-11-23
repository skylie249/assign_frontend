import { useState } from 'react';
import { useAssignments, useCloseMonth, useCopyPreviousAssignments, useTeamMembers } from '../../features/assignment/hooks';
import { useLeaves } from '../../features/leave/hooks';
import { currentMonth, monthLabel, shiftMonth } from '../../lib/month';

// 상주 팀장 지원(CLAUDE.md §5.5): "지난달 배치 + 이번 달 승인 휴가" 초안을 보여주고
// [확인] 한 번으로 이번 달을 확정한다. deputy가 대리로 눌러도 같은 화면 — 감사 로그는
// AssignApiController가 ctx.getMemail()(실제로 누른 사람)로 이미 남긴다(MONTH_CLOSE,
// AS7에서 구현됨 — 이 화면을 위해 새로 만들 필요 없음).
export default function MonthClosePage({ team }: { team: string }) {
	const [month, setMonth] = useState(currentMonth);
	const [message, setMessage] = useState<string | null>(null);
	const [closed, setClosed] = useState(false);
	const prevMonth = shiftMonth(month, -1);

	const membersQuery = useTeamMembers(team);
	const prevAssignmentsQuery = useAssignments(team, prevMonth);
	const currentAssignmentsQuery = useAssignments(team, month);
	const leavesQuery = useLeaves(team, month);
	const copyMutation = useCopyPreviousAssignments(team, month);
	const closeMutation = useCloseMonth(team);

	const mnameByMemail = new Map((membersQuery.data?.members ?? []).map((m) => [m.memail, m.mname]));

	const handleMonthChange = (delta: number) => {
		setMonth((m) => shiftMonth(m, delta));
		setMessage(null);
		setClosed(false);
	};

	const handleConfirm = async () => {
		setMessage(null);
		const currentCount = currentAssignmentsQuery.data?.assignments.length ?? 0;
		if (currentCount === 0) {
			const copyResult = await copyMutation.mutateAsync(false);
			if (copyResult.result === 'no_source') {
				setMessage('지난달 배치가 없어 복사는 건너뛰었습니다.');
			}
		}
		await closeMutation.mutateAsync(month);
		setClosed(true);
	};

	if (membersQuery.isLoading || prevAssignmentsQuery.isLoading || currentAssignmentsQuery.isLoading || leavesQuery.isLoading) {
		return <p className="text-sm text-slate-500">불러오는 중...</p>;
	}

	const prevAssignments = prevAssignmentsQuery.data?.assignments ?? [];
	const currentAssignments = currentAssignmentsQuery.data?.assignments ?? [];
	const leaves = leavesQuery.data?.leaves ?? [];
	const pending = copyMutation.isPending || closeMutation.isPending;

	return (
		<div className="mx-auto max-w-sm space-y-4">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => handleMonthChange(-1)}
					className="h-9 w-9 rounded-lg border border-slate-300 text-slate-600"
				>
					‹
				</button>
				<span className="text-base font-medium text-slate-900">{monthLabel(month)} 월말 확인</span>
				<button
					type="button"
					onClick={() => handleMonthChange(1)}
					className="h-9 w-9 rounded-lg border border-slate-300 text-slate-600"
				>
					›
				</button>
			</div>

			<section className="rounded-xl bg-white p-4 shadow-sm">
				<p className="text-sm font-medium text-slate-900">
					{currentAssignments.length > 0 ? `${monthLabel(month)} 배치 (이미 있음)` : `지난달(${monthLabel(prevMonth)}) 배치`}
				</p>
				<p className="mt-1 text-xs text-slate-400">
					{currentAssignments.length > 0
						? '이번 달 배치가 이미 있어 복사하지 않고 확인만 기록합니다.'
						: '확인을 누르면 이 배치를 이번 달로 복사합니다.'}
				</p>
				<div className="mt-2 space-y-1">
					{(currentAssignments.length > 0 ? currentAssignments : prevAssignments).map((a, i) => (
						<p key={a.id ?? i} className="text-sm text-slate-700">
							{mnameByMemail.get(a.memail) ?? a.memail} · {a.job_name ?? a.job_id} · {a.ratio}%
						</p>
					))}
					{currentAssignments.length === 0 && prevAssignments.length === 0 && (
						<p className="text-sm text-slate-400">지난달 배치가 없습니다.</p>
					)}
				</div>
			</section>

			<section className="rounded-xl bg-white p-4 shadow-sm">
				<p className="text-sm font-medium text-slate-900">{monthLabel(month)} 승인 휴가</p>
				<div className="mt-2 space-y-1">
					{leaves.map((l, i) => (
						<p key={l.id ?? i} className="text-sm text-slate-700">
							{mnameByMemail.get(l.memail) ?? l.memail} · {l.starts_on} ~ {l.ends_on} · {l.days}일
						</p>
					))}
					{leaves.length === 0 && <p className="text-sm text-slate-400">등록된 휴가가 없습니다.</p>}
				</div>
			</section>

			{message && <p className="text-sm text-slate-700">{message}</p>}

			{closed ? (
				<p className="rounded-lg bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">
					{monthLabel(month)} 월말 확인이 완료되었습니다.
				</p>
			) : (
				<button
					type="button"
					onClick={handleConfirm}
					disabled={pending}
					className="h-12 w-full rounded-lg bg-slate-900 text-base font-medium text-white disabled:opacity-60"
				>
					{pending ? '처리 중...' : '확인'}
				</button>
			)}
		</div>
	);
}
