import { useState } from 'react';
import { api } from '../../api/client';

const ERROR_MESSAGES: Record<string, string> = {
	wrongMid: '존재하지 않는 계정입니다.',
	wrongMpassword: '비밀번호가 올바르지 않습니다.',
	locked: '로그인 실패가 너무 많아 잠겼습니다. 10분 후 다시 시도해주세요.'
};

export default function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
	const [memail, setMemail] = useState('');
	const [mpassword, setMpassword] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setSubmitting(true);
		try {
			const data = await api.login(memail, mpassword);
			if (data.result === 'success') {
				onLoggedIn();
			} else {
				setError(ERROR_MESSAGES[data.result] ?? '로그인에 실패했습니다.');
			}
		} catch {
			setError('서버와 통신할 수 없습니다.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-sm"
			>
				<h1 className="text-lg font-semibold text-slate-900">배치표·확인</h1>
				{error && <p className="text-sm text-red-600">{error}</p>}
				<input
					type="email"
					placeholder="이메일"
					autoComplete="username"
					required
					value={memail}
					onChange={(e) => setMemail(e.target.value)}
					className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
				/>
				<input
					type="password"
					placeholder="비밀번호"
					autoComplete="current-password"
					required
					value={mpassword}
					onChange={(e) => setMpassword(e.target.value)}
					className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
				/>
				<button
					type="submit"
					disabled={submitting}
					className="h-11 w-full rounded-lg bg-slate-900 text-base font-medium text-white disabled:opacity-60"
				>
					{submitting ? '로그인 중...' : '로그인'}
				</button>
			</form>
		</div>
	);
}
