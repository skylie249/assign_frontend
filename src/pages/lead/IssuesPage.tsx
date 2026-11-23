import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAssignments } from '../../features/assignment/hooks';
import { useCreateIssue, useIssues, useUpdateIssue } from '../../features/issue/hooks';
import { newIssueSchema, type NewIssueFormValues } from '../../features/issue/schema';
import type { Issue, IssueStatus, UpdateIssueBody } from '../../api/client';
import { currentWeekStart, monthOfWeek, shiftWeek, weekLabel } from '../../lib/week';

const STATUS_LABELS: Record<IssueStatus, string> = { normal: '정상', caution: '주의', risk: '위험' };
const STATUS_BADGE: Record<IssueStatus, string> = {
	normal: 'bg-emerald-100 text-emerald-700',
	caution: 'bg-amber-100 text-amber-700',
	risk: 'bg-red-100 text-red-700'
};

function isOverdue(issue: Issue): boolean {
	return !!issue.due_on && !issue.resolved_at && issue.due_on < new Date().toISOString().slice(0, 10);
}

function IssueCard({ issue, onSave }: { issue: Issue; onSave: (body: UpdateIssueBody) => void }) {
	const [status, setStatus] = useState<IssueStatus>(issue.status);
	const [issueText, setIssueText] = useState(issue.issue ?? '');
	const [action, setAction] = useState(issue.action ?? '');
	const [dueOn, setDueOn] = useState(issue.due_on ?? '');
	const [resolved, setResolved] = useState(!!issue.resolved_at);

	const overdue = isOverdue(issue);

	return (
		<div className={'rounded-xl bg-white p-4 shadow-sm' + (overdue ? ' ring-2 ring-red-400' : '')}>
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium text-slate-900">{issue.job_name ?? issue.job_id}</p>
				<div className="flex items-center gap-2">
					{overdue && (
						<span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
							기한 초과
						</span>
					)}
					<span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + STATUS_BADGE[status]}>
						{STATUS_LABELS[status]}
					</span>
				</div>
			</div>
			<div className="mt-3 space-y-2">
				<select
					value={status}
					onChange={(e) => setStatus(e.target.value as IssueStatus)}
					className="h-10 w-full rounded-lg border border-slate-300 px-2 text-sm"
				>
					<option value="normal">정상</option>
					<option value="caution">주의</option>
					<option value="risk">위험</option>
				</select>
				<textarea
					value={issueText}
					onChange={(e) => setIssueText(e.target.value)}
					placeholder="이슈 (2줄 이내)"
					rows={2}
					className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
				/>
				<textarea
					value={action}
					onChange={(e) => setAction(e.target.value)}
					placeholder="조치·결정 (누가, 언제까지)"
					rows={2}
					className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
				/>
				<div className="flex items-center gap-3">
					<input
						type="date"
						value={dueOn}
						onChange={(e) => setDueOn(e.target.value)}
						className="h-10 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
					/>
					<label className="flex items-center gap-1 text-sm text-slate-600">
						<input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)} />
						해결됨
					</label>
				</div>
				<button
					type="button"
					onClick={() =>
						onSave({ status, issue: issueText, action, due_on: dueOn || null, resolved })
					}
					className="h-10 w-full rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
				>
					저장
				</button>
			</div>
		</div>
	);
}

export default function IssuesPage({ team }: { team: string }) {
	const [week, setWeek] = useState(currentWeekStart);
	const [message, setMessage] = useState<string | null>(null);
	const month = monthOfWeek(week);

	const issuesQuery = useIssues(team, week);
	const assignmentsQuery = useAssignments(team, month);
	const createMutation = useCreateIssue(team, week);
	const updateMutation = useUpdateIssue(team, week);

	const { register, handleSubmit, reset, formState: { errors } } = useForm<NewIssueFormValues>({
		resolver: zodResolver(newIssueSchema),
		defaultValues: { job_id: '', status: 'normal', issue: '', action: '', due_on: '' }
	});

	const projectOptions = useMemo(() => {
		const map = new Map<string, string>();
		for (const row of assignmentsQuery.data?.assignments ?? []) {
			map.set(row.job_id, row.job_name ?? row.job_id);
		}
		return [...map.entries()];
	}, [assignmentsQuery.data]);

	const onCreate = async (values: NewIssueFormValues) => {
		setMessage(null);
		const result = await createMutation.mutateAsync({ ...values, week_start: week, due_on: values.due_on || null });
		if (result.result === 'SUCCESS') {
			reset({ job_id: '', status: 'normal', issue: '', action: '', due_on: '' });
		} else {
			setMessage(result.message ?? '등록에 실패했습니다.');
		}
	};

	const handleDownload = async () => {
		if (!issuesQuery.data || !assignmentsQuery.data) return;
		// docx 라이브러리는 번들이 커서(~250KB) 이 버튼을 눌렀을 때만 불러온다.
		const { buildWeeklyDocx, downloadBlob } = await import('../../features/report/weeklyDocx');
		const blob = await buildWeeklyDocx({
			teamCode: team,
			weekLabel: weekLabel(week),
			month,
			issues: issuesQuery.data.issues,
			assignments: assignmentsQuery.data.assignments
		});
		downloadBlob(blob, `${team}_${week}_주간보고.docx`);
	};

	if (issuesQuery.isLoading || assignmentsQuery.isLoading) {
		return <p className="text-sm text-slate-500">불러오는 중...</p>;
	}
	if (issuesQuery.isError || assignmentsQuery.isError) {
		return <p className="text-sm text-red-600">이슈를 불러오지 못했습니다.</p>;
	}

	const issues = issuesQuery.data?.issues ?? [];

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setWeek((w) => shiftWeek(w, -1))}
						className="h-9 w-9 rounded-lg border border-slate-300 text-slate-600"
					>
						‹
					</button>
					<span className="text-center text-base font-medium text-slate-900">{weekLabel(week)}</span>
					<button
						type="button"
						onClick={() => setWeek((w) => shiftWeek(w, 1))}
						className="h-9 w-9 rounded-lg border border-slate-300 text-slate-600"
					>
						›
					</button>
				</div>
				<button
					type="button"
					onClick={handleDownload}
					className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-700"
				>
					워드 다운로드
				</button>
			</div>

			{message && <p className="text-sm text-slate-700">{message}</p>}

			<div className="space-y-3">
				{issues.map((issue) => (
					<IssueCard
						key={issue.id}
						issue={issue}
						onSave={(body) => updateMutation.mutate({ id: issue.id, body })}
					/>
				))}
			</div>

			<form onSubmit={handleSubmit(onCreate)} className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
				<p className="text-sm font-medium text-slate-900">새 이슈</p>
				<select
					{...register('job_id')}
					className="h-10 w-full rounded-lg border border-slate-300 px-2 text-sm"
				>
					<option value="">프로젝트 선택</option>
					{projectOptions.map(([jobId, jobName]) => (
						<option key={jobId} value={jobId}>
							{jobName}
						</option>
					))}
				</select>
				{errors.job_id && <p className="text-xs text-red-600">{errors.job_id.message}</p>}
				<select
					{...register('status')}
					className="h-10 w-full rounded-lg border border-slate-300 px-2 text-sm"
				>
					<option value="normal">정상</option>
					<option value="caution">주의</option>
					<option value="risk">위험</option>
				</select>
				<textarea
					{...register('issue')}
					placeholder="이슈 (2줄 이내)"
					rows={2}
					className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
				/>
				{errors.issue && <p className="text-xs text-red-600">{errors.issue.message}</p>}
				<textarea
					{...register('action')}
					placeholder="조치·결정 (누가, 언제까지)"
					rows={2}
					className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
				/>
				<input
					type="date"
					{...register('due_on')}
					className="h-10 w-full rounded-lg border border-slate-300 px-2 text-sm"
				/>
				<button
					type="submit"
					disabled={createMutation.isPending}
					className="h-10 w-full rounded-lg bg-slate-900 text-sm font-medium text-white disabled:opacity-60"
				>
					등록
				</button>
			</form>
		</div>
	);
}
