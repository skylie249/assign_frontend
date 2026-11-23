import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTeamMembers } from '../../features/assignment/hooks';
import { useLeaves, useSaveLeaves } from '../../features/leave/hooks';
import { leaveFormSchema, type LeaveFormValues } from '../../features/leave/schema';
import { currentMonth, monthLabel, shiftMonth } from '../../lib/month';

export default function LeavesPage({ team }: { team: string }) {
	const [month, setMonth] = useState(currentMonth);
	const [message, setMessage] = useState<string | null>(null);

	const membersQuery = useTeamMembers(team);
	const leavesQuery = useLeaves(team, month);
	const saveMutation = useSaveLeaves(team, month);

	const {
		control,
		register,
		handleSubmit,
		reset,
		setValue,
		getValues,
		formState: { errors }
	} = useForm<LeaveFormValues>({
		resolver: zodResolver(leaveFormSchema),
		defaultValues: { rows: [] }
	});
	const { fields, append, remove } = useFieldArray({ control, name: 'rows' });

	useEffect(() => {
		setMessage(null);
	}, [month]);

	useEffect(() => {
		if (!leavesQuery.data) return;
		reset({
			rows: leavesQuery.data.leaves.map((l) => ({
				memail: l.memail,
				starts_on: l.starts_on,
				ends_on: l.ends_on,
				days: l.days
			}))
		});
	}, [leavesQuery.data, reset]);

	const onSubmit = async (values: LeaveFormValues) => {
		setMessage(null);
		const result = await saveMutation.mutateAsync(
			values.rows.map((r) => ({ ...r, source: 'groupware_approved' as const }))
		);
		setMessage(result.result === 'SUCCESS' ? '저장되었습니다.' : result.message ?? '저장에 실패했습니다.');
	};

	const addRow = (memail: string) => {
		append({ memail, starts_on: '', ends_on: '', days: 1 });
	};

	const setHalfDay = (index: number) => {
		const startsOn = getValues(`rows.${index}.starts_on`);
		setValue(`rows.${index}.days`, 0.5);
		if (startsOn) setValue(`rows.${index}.ends_on`, startsOn);
	};

	if (membersQuery.isLoading || leavesQuery.isLoading) {
		return <p className="text-sm text-slate-500">불러오는 중...</p>;
	}
	if (membersQuery.isError || leavesQuery.isError) {
		return <p className="text-sm text-red-600">휴가 목록을 불러오지 못했습니다.</p>;
	}

	const members = membersQuery.data?.members ?? [];

	return (
		<div className="space-y-4">
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
			<p className="text-sm text-slate-500">
				그룹웨어에서 이미 승인된 휴가만 등록합니다. 기간이 이 달과 겹치는 휴가를 모두 입력하세요.
			</p>

			{message && <p className="text-sm text-slate-700">{message}</p>}

			<form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
				{members.map((member) => (
					<section key={member.memail} className="rounded-xl bg-white p-4 shadow-sm">
						<p className="text-sm font-medium text-slate-900">
							{member.mname}
							<span className="ml-1 text-xs text-slate-400">{member.mposName}</span>
						</p>
						<div className="mt-3 space-y-2">
							{fields.map((field, index) =>
								field.memail === member.memail ? (
									<div key={field.id} className="flex flex-wrap items-center gap-2">
										<input
											type="date"
											{...register(`rows.${index}.starts_on`, {
												onChange: (e) => {
													const value = e.target.value;
													const endsOn = getValues(`rows.${index}.ends_on`);
													if (!endsOn || endsOn < value) {
														setValue(`rows.${index}.ends_on`, value);
													}
												}
											})}
											className="h-10 w-36 rounded-lg border border-slate-300 px-2 text-sm"
										/>
										<span className="text-slate-400">~</span>
										<input
											type="date"
											{...register(`rows.${index}.ends_on`)}
											className="h-10 w-36 rounded-lg border border-slate-300 px-2 text-sm"
										/>
										<input
											type="number"
											step={0.5}
											min={0.5}
											{...register(`rows.${index}.days`, { valueAsNumber: true })}
											className="h-10 w-16 rounded-lg border border-slate-300 px-2 text-sm"
										/>
										<button
											type="button"
											onClick={() => setHalfDay(index)}
											className="h-10 rounded-lg border border-slate-300 px-2 text-xs text-slate-600"
										>
											반차
										</button>
										<button
											type="button"
											onClick={() => remove(index)}
											className="h-10 w-10 shrink-0 text-slate-400"
											aria-label="삭제"
										>
											삭제
										</button>
										{errors.rows?.[index] && (
											<p className="w-full text-xs text-red-600">
												{errors.rows[index]?.ends_on?.message ??
													errors.rows[index]?.starts_on?.message ??
													errors.rows[index]?.days?.message}
											</p>
										)}
									</div>
								) : null
							)}
							<button
								type="button"
								onClick={() => addRow(member.memail)}
								className="text-sm text-slate-500 underline"
							>
								+ 휴가 추가
							</button>
						</div>
					</section>
				))}

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
