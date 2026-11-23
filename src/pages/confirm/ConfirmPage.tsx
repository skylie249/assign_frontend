import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type ChangeItem, type ConfirmCard, type ExistingConfirmation } from '../../api/client';

const STATUS_LABELS: Record<ExistingConfirmation['status'], string> = {
	confirmed: '배정대로 진행하기로 확인했습니다.',
	changed: '"배정이 달라요"로 제출했습니다.',
	auto_assumed: '응답이 없어 배정대로 진행으로 자동 처리되었습니다.'
};

type ChangeType = 'leave' | 'new_project' | 'ratio_change' | 'other';

export default function ConfirmPage() {
	const { token = '' } = useParams<{ token: string }>();
	const [loading, setLoading] = useState(true);
	const [card, setCard] = useState<ConfirmCard | null>(null);
	const [unavailable, setUnavailable] = useState<string | null>(null);
	const [mode, setMode] = useState<'view' | 'change'>('view');
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const [changeType, setChangeType] = useState<ChangeType>('leave');
	const [days, setDays] = useState(1);
	const [newProjectRatio, setNewProjectRatio] = useState(50);
	const [selectedJobId, setSelectedJobId] = useState('');
	const [newRatio, setNewRatio] = useState(0);
	const [note, setNote] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		const result = await api.getConfirmCard(token);
		if ('memail' in result) {
			setCard(result);
			setUnavailable(null);
		} else {
			setUnavailable(
				result.result === 'rate_limited'
					? '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
					: result.message ?? '링크를 사용할 수 없습니다.'
			);
		}
		setLoading(false);
	}, [token]);

	useEffect(() => {
		load();
	}, [load]);

	const submit = async (status: 'confirmed' | 'changed', changes?: ChangeItem[]) => {
		setSubmitting(true);
		setSubmitError(null);
		const result = await api.submitConfirmation(token, {
			status,
			changes,
			note: note.trim() ? note.trim() : undefined
		});
		setSubmitting(false);
		if (result.result === 'SUCCESS') {
			setMode('view');
			setNote('');
			await load();
		} else if (result.result === 'invalid') {
			setSubmitError(result.message ?? '제출에 실패했습니다.');
		} else {
			setUnavailable(result.message ?? '링크를 사용할 수 없습니다.');
		}
	};

	const handleConfirm = () => submit('confirmed');

	const handleSubmitChange = () => {
		let item: ChangeItem;
		if (changeType === 'leave') {
			item = { type: 'leave', days };
		} else if (changeType === 'new_project') {
			item = { type: 'new_project', ratio: newProjectRatio };
		} else if (changeType === 'ratio_change') {
			if (!selectedJobId) {
				setSubmitError('프로젝트를 선택하세요.');
				return;
			}
			item = { type: 'ratio_change', job_id: selectedJobId, new_ratio: newRatio };
		} else {
			item = { type: 'other' };
		}
		submit('changed', [item]);
	};

	if (loading) {
		return <div className="min-h-screen bg-slate-50" />;
	}

	if (unavailable) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
				<p className="text-sm text-slate-600">{unavailable}</p>
			</div>
		);
	}

	if (!card) {
		return null;
	}

	if (card.existing_confirmation && mode === 'view') {
		const existing = card.existing_confirmation;
		return (
			<div className="min-h-screen bg-slate-50 px-4 py-6">
				<div className="mx-auto max-w-sm space-y-4">
					<p className="text-base font-medium text-slate-900">{card.mname}님</p>
					<p className="text-xs text-slate-400">
						{card.period_start} ~ {card.period_end}
					</p>
					<div className="rounded-xl bg-white p-4 shadow-sm">
						<p className="text-sm text-slate-700">{STATUS_LABELS[existing.status]}</p>
						{existing.note && <p className="mt-1 text-xs text-slate-500">특이사항: {existing.note}</p>}
						{existing.submitted_at && (
							<p className="mt-2 text-xs text-slate-400">제출: {existing.submitted_at}</p>
						)}
					</div>
					<button
						type="button"
						onClick={() => {
							setSubmitError(null);
							setMode('change');
							// "수정"은 처음부터 다시 작성하게 한다 — 이전 선택 내용은 복원하지 않음(단순화).
						}}
						className="h-11 w-full rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
					>
						수정
					</button>
				</div>
			</div>
		);
	}

	if (mode === 'change') {
		return (
			<div className="min-h-screen bg-slate-50 px-4 py-6">
				<div className="mx-auto max-w-sm space-y-3">
					<p className="text-base font-medium text-slate-900">배정이 달라요</p>
					<select
						value={changeType}
						onChange={(e) => setChangeType(e.target.value as ChangeType)}
						className="h-11 w-full rounded-lg border border-slate-300 px-2 text-sm"
					>
						<option value="leave">휴가·부재</option>
						<option value="new_project">추가 업무</option>
						<option value="ratio_change">비율 변경</option>
						<option value="other">기타</option>
					</select>

					{changeType === 'leave' && (
						<label className="block text-sm text-slate-700">
							일수
							<input
								type="number"
								min={0.5}
								step={0.5}
								value={days}
								onChange={(e) => setDays(Number(e.target.value))}
								className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-2"
							/>
						</label>
					)}

					{changeType === 'new_project' && (
						<label className="block text-sm text-slate-700">
							대략 투입 비율(%)
							<input
								type="number"
								min={0}
								max={100}
								value={newProjectRatio}
								onChange={(e) => setNewProjectRatio(Number(e.target.value))}
								className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-2"
							/>
						</label>
					)}

					{changeType === 'ratio_change' && (
						<>
							<label className="block text-sm text-slate-700">
								프로젝트
								<select
									value={selectedJobId}
									onChange={(e) => setSelectedJobId(e.target.value)}
									className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-2"
								>
									<option value="">선택</option>
									{card.assignments.map((a) => (
										<option key={a.job_id} value={a.job_id}>
											{a.job_name ?? a.job_id}
										</option>
									))}
								</select>
							</label>
							<label className="block text-sm text-slate-700">
								새 투입 비율(%)
								<input
									type="number"
									min={0}
									max={100}
									value={newRatio}
									onChange={(e) => setNewRatio(Number(e.target.value))}
									className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-2"
								/>
							</label>
						</>
					)}

					<label className="block text-sm text-slate-700">
						특이사항 (선택, 100자)
						<input
							type="text"
							maxLength={100}
							value={note}
							onChange={(e) => setNote(e.target.value)}
							className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-2"
						/>
					</label>

					{submitError && <p className="text-sm text-red-600">{submitError}</p>}

					<button
						type="button"
						onClick={handleSubmitChange}
						disabled={submitting}
						className="h-12 w-full rounded-lg bg-slate-900 text-base font-medium text-white disabled:opacity-60"
					>
						{submitting ? '제출 중...' : '제출'}
					</button>
					<button
						type="button"
						onClick={() => {
							setMode('view');
							setSubmitError(null);
						}}
						className="h-11 w-full text-sm text-slate-500"
					>
						취소
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6">
			<div className="mx-auto max-w-sm space-y-3">
				<p className="text-base font-medium text-slate-900">{card.mname}님</p>
				<p className="text-xs text-slate-400">
					{card.period_start} ~ {card.period_end}
				</p>
				<div className="space-y-2">
					{card.assignments.length === 0 && (
						<p className="rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">
							이번 달 등록된 배치가 없습니다.
						</p>
					)}
					{card.assignments.map((a) => (
						<div key={a.job_id} className="rounded-xl bg-white p-4 shadow-sm">
							<p className="text-sm font-medium text-slate-900">
								{a.job_name ?? a.job_id} · {a.ratio}%
							</p>
							{a.role_name && <p className="text-xs text-slate-400">{a.role_name}</p>}
						</div>
					))}
				</div>

				{submitError && <p className="text-sm text-red-600">{submitError}</p>}

				<button
					type="button"
					onClick={handleConfirm}
					disabled={submitting}
					className="h-12 w-full rounded-lg bg-slate-900 text-base font-medium text-white disabled:opacity-60"
				>
					{submitting ? '제출 중...' : '배정대로 진행'}
				</button>
				<button
					type="button"
					onClick={() => setMode('change')}
					className="h-11 w-full text-sm text-slate-500 underline"
				>
					배정이 달라요
				</button>
			</div>
		</div>
	);
}
