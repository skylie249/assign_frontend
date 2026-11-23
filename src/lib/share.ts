export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'failed';

// Web Share API가 있으면 그걸 먼저 쓰고(메신저·문자 앱 선택지가 뜬다), 없거나 실패하면
// 클립보드 복사로 떨어진다. 앱이 직접 문자·메일을 보내지 않는다(CLAUDE.md §5.6).
export async function shareOrCopy(url: string, title: string): Promise<ShareResult> {
	if (navigator.share) {
		try {
			await navigator.share({ title, url });
			return 'shared';
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') {
				return 'cancelled';
			}
			// 다른 오류(지원 안 함 등)는 복사로 폴백.
		}
	}
	try {
		await navigator.clipboard.writeText(url);
		return 'copied';
	} catch {
		return 'failed';
	}
}
