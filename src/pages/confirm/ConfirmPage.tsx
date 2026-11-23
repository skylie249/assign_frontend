import { useParams } from 'react-router-dom';

// 팀원 모바일 확인 화면 자리. 실제 토큰 조회·제출(AS5 API 연동)은 AS17에서 구현한다.
export default function ConfirmPage() {
	const { token } = useParams<{ token: string }>();

	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
			<div>
				<p className="text-base text-slate-700">준비 중입니다.</p>
				<p className="mt-1 text-xs text-slate-400">token: {token}</p>
			</div>
		</div>
	);
}
