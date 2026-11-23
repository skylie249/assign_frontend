import { useEffect, useState } from 'react';
import { useTeamMembers } from '../../features/assignment/hooks';
import {
	useCreatePeriod,
	useIssueTokens,
	usePeriodStatus,
	useReissueToken,
	useReviewConfirmation
} from '../../features/link/hooks';
import { loadRecentPeriods, saveRecentPeriod } from '../../lib/recentPeriods';
import { shareOrCopy } from '../../lib/share';
import { currentWeekStart, shiftWeek, weekEnd, weekLabel } from '../../lib/week';
import type { ConfirmationStatus, Period, PeriodStatusMember } from '../../api/client';

const STATUS_LABELS: Record<ConfirmationStatus, string> = {
	confirmed: '확인함',
	changed: '달라짐',
	auto_assumed: '간주'
};
const STATUS_BADGE: Record<ConfirmationStatus, string> = {
	confirmed: 'bg-emerald-100 text-emerald-700',
	changed: 'bg-amber-100 text-amber-700',
	auto_assumed: 'bg-slate-200 text-slate-600'
};

interface IssuedLink {
	memail: string;
	token: string;
	expiresAt: string;
}

function LinkCard({ link, mname }: { link: IssuedLink; mname: string }) {
	const [message, setMessage] = useState<string | null>(null);
	const url = window.location.origin + '/c/' + link.token;

	const handleShare = async () => {
		const result = await shareOrCopy(url, '배치 확인 링크');
		setMessage(
			result === 'shared'
				? '공유했습니다.'
				: result === 'copied'
					? '공유를 지원하지 않아 링크를 복사했습니다.'
					: result === 'cancelled'
						? null
						: '공유·복사에 실패했습니다.'
		);
	};
	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setMessage('링크를 복사했습니다.');
		} catch {
			setMessage('복사에 실패했습니다.');
		}
	};

	return (
		<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
			<div>
				<p className="text-sm font-medium text-slate-900">{mname}</p>
				<p className="truncate text-xs text-slate-400">{url}</p>
				{message && <p className="text-xs text-slate-600">{message}</p>}
			</div>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={handleShare}
					className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white"
				>
					공유
				</button>
				<button
					type="button"
					onClick={handleCopy}
					className="h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-700"
				>
					복사
				</button>
			</div>
		</div>
	);
}

function MemberStatusRow({
	member,
	onReissue,
	onReview
}: {
	member: PeriodStatusMember;
	onReissue: () => void;
	onReview: (action: 'apply' | 'ignore') => void;
}) {
	const [showChanges, setShowChanges] = useState(false);
	let prettyChanges = member.changes_json;
	try {
		if (member.changes_json) prettyChanges = JSON.stringify(JSON.parse(member.changes_json), null, 2);
	} catch {
		// 파싱 실패하면 원문 그대로 보여준다.
	}

	return (
		<div className="rounded-lg border border-slate-200 p-3">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium text-slate-900">{member.mname}</p>
				<div className="flex items-center gap-2">
					{member.status ? (
						<span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + STATUS_BADGE[member.status]}>
							{STATUS_LABELS[member.status]}
						</span>
					) : (
						<span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
							미응답
						</span>
					)}
					<button type="button" onClick={onReissue} className="text-xs text-slate-500 underline">
						재발급
					</button>
				</div>
			</div>
			{member.note && <p className="mt-1 text-xs text-slate-500">특이사항: {member.note}</p>}
			{member.needs_review && (
				<div className="mt-2 rounded-md bg-amber-50 p-2">
					<button
						type="button"
						onClick={() => setShowChanges((v) => !v)}
						className="text-xs font-medium text-amber-800 underline"
					>
						검토 필요 — 변경 내용 {showChanges ? '숨기기' : '보기'}
					</button>
					{showChanges && (
						<pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
							{prettyChanges}
						</pre>
					)}
					<div className="mt-2 flex gap-2">
						<button
							type="button"
							onClick={() => onReview('apply')}
							className="h-8 rounded-md bg-amber-600 px-2 text-xs font-medium text-white"
						>
							반영
						</button>
						<button
							type="button"
							onClick={() => onReview('ignore')}
							className="h-8 rounded-md border border-amber-300 px-2 text-xs text-amber-700"
						>
							무시
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export default function LinksPage({ team }: { team: string }) {
	const [recentPeriods, setRecentPeriods] = useState<Period[]>([]);
	const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
	const [newWeek, setNewWeek] = useState(currentWeekStart);
	const [selectedMemails, setSelectedMemails] = useState<Set<string>>(new Set());
	const [issuedLinks, setIssuedLinks] = useState<IssuedLink[]>([]);
	const [issueErrors, setIssueErrors] = useState<string[]>([]);

	const membersQuery = useTeamMembers(team);
	const statusQuery = usePeriodStatus(selectedPeriodId);
	const createPeriodMutation = useCreatePeriod(team);
	const issueTokensMutation = useIssueTokens(selectedPeriodId ?? 0);
	const reissueMutation = useReissueToken();
	const reviewMutation = useReviewConfirmation(selectedPeriodId ?? 0);

	useEffect(() => {
		setRecentPeriods(loadRecentPeriods(team));
	}, [team]);

	const members = membersQuery.data?.members ?? [];
	const confirmTargets = members.filter((m) => m.work_type === 'non_resident');
	const mnameByMemail = new Map(members.map((m) => [m.memail, m.mname]));

	const handleCreatePeriod = async () => {
		const result = await createPeriodMutation.mutateAsync({
			period_start: newWeek,
			period_end: weekEnd(newWeek)
		});
		if ('id' in result) {
			saveRecentPeriod(team, result);
			setRecentPeriods((prev) => [result, ...prev.filter((p) => p.id !== result.id)]);
			setSelectedPeriodId(result.id);
		}
	};

	const toggleMemail = (memail: string) => {
		setSelectedMemails((prev) => {
			const next = new Set(prev);
			if (next.has(memail)) next.delete(memail);
			else next.add(memail);
			return next;
		});
	};

	const handleIssue = async () => {
		if (!selectedPeriodId || selectedMemails.size === 0) return;
		const result = await issueTokensMutation.mutateAsync([...selectedMemails]);
		const newLinks: IssuedLink[] = [];
		const errors: string[] = [];
		for (const r of result.results) {
			if (r.token) {
				newLinks.push({ memail: r.memail, token: r.token, expiresAt: r.expires_at ?? '' });
			} else if (r.error) {
				errors.push((mnameByMemail.get(r.memail) ?? r.memail) + ': ' + r.error);
			}
		}
		setIssuedLinks(newLinks);
		setIssueErrors(errors);
		setSelectedMemails(new Set());
		statusQuery.refetch();
	};

	const handleReissue = async (tokenId: number, memail: string) => {
		const result = await reissueMutation.mutateAsync(tokenId);
		setIssuedLinks((prev) => [
			{ memail, token: result.token, expiresAt: result.expires_at },
			...prev.filter((l) => l.memail !== memail)
		]);
		statusQuery.refetch();
	};

	const summary = statusQuery.data?.summary;

	return (
		<div className="space-y-4">
			<section className="rounded-xl bg-white p-4 shadow-sm">
				<p className="text-sm font-medium text-slate-900">확인 기간</p>
				{recentPeriods.length > 0 && (
					<select
						value={selectedPeriodId ?? ''}
						onChange={(e) => setSelectedPeriodId(e.target.value ? Number(e.target.value) : null)}
						className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm"
					>
						<option value="">선택 안 함</option>
						{recentPeriods.map((p) => (
							<option key={p.id} value={p.id}>
								{p.period_start} ~ {p.period_end}
							</option>
						))}
					</select>
				)}
				<div className="mt-3 flex items-center gap-2">
					<button
						type="button"
						onClick={() => setNewWeek((w) => shiftWeek(w, -1))}
						className="h-9 w-9 rounded-lg border border-slate-300 text-slate-600"
					>
						‹
					</button>
					<span className="text-sm text-slate-700">{weekLabel(newWeek)}</span>
					<button
						type="button"
						onClick={() => setNewWeek((w) => shiftWeek(w, 1))}
						className="h-9 w-9 rounded-lg border border-slate-300 text-slate-600"
					>
						›
					</button>
					<button
						type="button"
						onClick={handleCreatePeriod}
						disabled={createPeriodMutation.isPending}
						className="h-9 flex-1 rounded-lg bg-slate-900 text-sm font-medium text-white disabled:opacity-60"
					>
						이 주로 확인 기간 만들기
					</button>
				</div>
				<p className="mt-1 text-xs text-slate-400">
					응답 기간은 기본값(금요일 09:00 ~ 화요일 12:00)으로 자동 설정됩니다.
				</p>
			</section>

			{selectedPeriodId && (
				<section className="rounded-xl bg-white p-4 shadow-sm">
					<p className="text-sm font-medium text-slate-900">링크 발급</p>
					<p className="mt-1 text-xs text-slate-400">
						비상주·겸직 인력에게만 발급할 수 있습니다(상주 인력은 목록에 없습니다).
					</p>
					<div className="mt-2 space-y-1">
						{confirmTargets.map((m) => (
							<label key={m.memail} className="flex items-center gap-2 text-sm text-slate-700">
								<input
									type="checkbox"
									checked={selectedMemails.has(m.memail)}
									onChange={() => toggleMemail(m.memail)}
								/>
								{m.mname}
							</label>
						))}
						{confirmTargets.length === 0 && (
							<p className="text-sm text-slate-400">비상주·겸직으로 등록된 팀원이 없습니다.</p>
						)}
					</div>
					<button
						type="button"
						onClick={handleIssue}
						disabled={issueTokensMutation.isPending || selectedMemails.size === 0}
						className="mt-3 h-10 w-full rounded-lg bg-slate-900 text-sm font-medium text-white disabled:opacity-60"
					>
						선택한 {selectedMemails.size}명에게 링크 발급
					</button>
					{issueErrors.length > 0 && (
						<ul className="mt-2 list-disc pl-4 text-xs text-red-600">
							{issueErrors.map((e, i) => (
								<li key={i}>{e}</li>
							))}
						</ul>
					)}
					{issuedLinks.length > 0 && (
						<div className="mt-3 space-y-2">
							{issuedLinks.map((link) => (
								<LinkCard key={link.memail} link={link} mname={mnameByMemail.get(link.memail) ?? link.memail} />
							))}
						</div>
					)}
				</section>
			)}

			{selectedPeriodId && statusQuery.data && (
				<section className="rounded-xl bg-white p-4 shadow-sm">
					<p className="text-sm font-medium text-slate-900">확인 현황</p>
					{summary && (
						<div className="mt-2 flex flex-wrap gap-2 text-xs">
							<span className="rounded-full bg-slate-100 px-2 py-1">발급 {summary.issued}</span>
							<span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
								확인 {summary.confirmed}
							</span>
							<span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
								달라짐 {summary.changed}
							</span>
							<span className="rounded-full bg-slate-200 px-2 py-1 text-slate-600">
								간주 {summary.auto_assumed}
							</span>
							<span className="rounded-full bg-red-100 px-2 py-1 text-red-700">
								미응답 {summary.no_response}
							</span>
							{summary.pending_review > 0 && (
								<span className="rounded-full bg-amber-600 px-2 py-1 text-white">
									검토 대기 {summary.pending_review}
								</span>
							)}
						</div>
					)}
					<div className="mt-3 space-y-2">
						{statusQuery.data.members.map((m) => (
							<MemberStatusRow
								key={m.memail}
								member={m}
								onReissue={() => handleReissue(m.token_id, m.memail)}
								onReview={(action) =>
									m.confirmation_id &&
									reviewMutation.mutate({ confirmationId: m.confirmation_id, action })
								}
							/>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
