import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	useAssignments,
	useCopyPreviousAssignments,
	useProjects,
	useSaveAssignments,
	useTeamMembers
} from '../../features/assignment/hooks';
import { assignmentFormSchema, type AssignmentFormValues } from '../../features/assignment/schema';
import { currentMonth, monthLabel, shiftMonth } from '../../lib/month';

const RATIO_EPSILON = 0.01;

export default function AssignmentsPage({ team }: { team: string }) {
	const [month, setMonth] = useState(currentMonth);
	const [message, setMessage] = useState<string | null>(null);
	const [confirmOverwrite, setConfirmOverwrite] = useState<{ existingCount: number } | null>(null);

	const membersQuery = useTeamMembers(team);
	const projectsQuery = useProjects(team);
	const assignmentsQuery = useAssignments(team, month);
	const saveMutation = useSaveAssignments(team, month);
	const copyMutation = useCopyPreviousAssignments(team, month);

	const { control, register, handleSubmit, reset } = useForm<AssignmentFormValues>({
		resolver: zodResolver(assignmentFormSchema),
		defaultValues: { rows: [] }
	});
	const { fields, append, remove } = useFieldArray({ control, name: 'rows' });
	const watchedRows = useWatch({ control, name: 'rows' });

	useEffect(() => {
		setMessage(null);
		setConfirmOverwrite(null);
	}, [month]);

	useEffect(() => {
		if (!assignmentsQuery.data) return;
		reset({
			rows: assignmentsQuery.data.assignments.map((a) => ({
				memail: a.memail,
				job_id: a.job_id,
				role_name: a.role_name ?? '',
				ratio: a.ratio
			}))
		});
	}, [assignmentsQuery.data, reset]);

	const ratioTotals = useMemo(() => {
		const totals = new Map<string, number>();
		for (const row of watchedRows ?? []) {
			if (!row?.memail) continue;
			totals.set(row.memail, (totals.get(row.memail) ?? 0) + (Number(row.ratio) || 0));
		}
		return totals;
	}, [watchedRows]);

	const onSubmit = async (values: AssignmentFormValues) => {
		setMessage(null);
		const result = await saveMutation.mutateAsync(values.rows);
		if (result.result === 'SUCCESS') {
			setMessage('저장되었습니다.');
		} else {
			setMessage(result.message ?? '저장에 실패했습니다.');
		}
	};

	const handleCopyPrevious = async (overwrite: boolean) => {
		setMessage(null);
		const result = await copyMutation.mutateAsync(overwrite);
		if (result.result === 'needs_confirm') {
			setConfirmOverwrite({ existingCount: result.existing_count });
		} else if (result.result === 'no_source') {
			setMessage(result.message);
			setConfirmOverwrite(null);
		} else {
			setMessage(`지난달 배치 ${result.copied_count}건을 복사했습니다.`);
			setConfirmOverwrite(null);
		}
	};

	if (membersQuery.isLoading || projectsQuery.isLoading || assignmentsQuery.isLoading) {
		return <p className="text-sm text-slate-500">불러오는 중...</p>;
	}
	if (membersQuery.isError || projectsQuery.isError || assignmentsQuery.isError) {
		return <p className="text-sm text-red-600">배치표를 불러오지 못했습니다.</p>;
	}

	const members = membersQuery.data?.members ?? [];
	const projects = projectsQuery.data?.projects ?? [];

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setMonth((m) => shiftMonth(m, -1))}
						className="h-9 w-9 rounded-lg border border-slate-300 text-slate-600"
					>
						‹
					</button>
					<span className="w-28 text-center text-base font-medium text-slate-900">
						{monthLabel(month)}
					</span>
					<button
						type="button"
						onClick={() => setMonth((m) => shiftMonth(m, 1))}
						className="h-9 w-9 rounded-lg border border-slate-300 text-slate-600"
					>
						›
					</button>
				</div>
				<button
					type="button"
					onClick={() => handleCopyPrevious(false)}
					disabled={copyMutation.isPending}
					className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-700"
				>
					지난달과 동일
				</button>
			</div>

			{confirmOverwrite && (
				<div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
					<span>이번 달 배치 {confirmOverwrite.existingCount}건이 이미 있습니다. 덮어쓸까요?</span>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => handleCopyPrevious(true)}
							className="rounded-md bg-amber-600 px-2 py-1 text-white"
						>
							덮어쓰기
						</button>
						<button type="button" onClick={() => setConfirmOverwrite(null)} className="px-2 py-1">
							취소
						</button>
					</div>
				</div>
			)}

			{message && <p className="text-sm text-slate-700">{message}</p>}

			<form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
				{members.map((member) => {
					const total = ratioTotals.get(member.memail) ?? 0;
					const isOff = Math.abs(total - 100) > RATIO_EPSILON;
					return (
						<section key={member.memail} className="rounded-xl bg-white p-4 shadow-sm">
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium text-slate-900">
									{member.mname}
									<span className="ml-1 text-xs text-slate-400">{member.mposName}</span>
								</p>
								<span
									className={
										'rounded-full px-2 py-0.5 text-xs font-medium ' +
										(isOff ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')
									}
								>
									합계 {total}%
								</span>
							</div>
							<div className="mt-3 space-y-2">
								{fields.map((field, index) =>
									field.memail === member.memail ? (
										<div key={field.id} className="flex items-center gap-2">
											<select
												{...register(`rows.${index}.job_id`)}
												className="h-10 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
											>
												<option value="">프로젝트 선택</option>
												{projects.map((p) => (
													<option key={p.job_id} value={p.job_id}>
														{p.job_name}
													</option>
												))}
											</select>
											<input
												{...register(`rows.${index}.role_name`)}
												placeholder="역할"
												className="h-10 w-24 rounded-lg border border-slate-300 px-2 text-sm"
											/>
											<input
												type="number"
												{...register(`rows.${index}.ratio`, { valueAsNumber: true })}
												placeholder="%"
												min={0}
												max={100}
												className="h-10 w-20 rounded-lg border border-slate-300 px-2 text-sm"
											/>
											<button
												type="button"
												onClick={() => remove(index)}
												className="h-10 w-10 shrink-0 text-slate-400"
												aria-label="줄 삭제"
											>
												삭제
											</button>
										</div>
									) : null
								)}
								<button
									type="button"
									onClick={() =>
										append({ memail: member.memail, job_id: '', role_name: '', ratio: 0 })
									}
									className="text-sm text-slate-500 underline"
								>
									+ 줄 추가
								</button>
							</div>
						</section>
					);
				})}

				<button
					type="submit"
					disabled={saveMutation.isPending}
					className="h-11 w-full rounded-lg bg-slate-900 text-base font-medium text-white disabled:opacity-60"
				>
					{saveMutation.isPending ? '저장 중...' : '저장'}
				</button>
			</form>
		</div>
	);
}
