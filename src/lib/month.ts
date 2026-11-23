import { addMonths, format, parse } from 'date-fns';

// "YYYY-MM" <-> Date 변환. Asia/Seoul 고정 서비스라 타임존 변환 없이 로컬 시간 그대로 쓴다.
export function currentMonth(): string {
	return format(new Date(), 'yyyy-MM');
}

export function shiftMonth(month: string, delta: number): string {
	const date = parse(month, 'yyyy-MM', new Date());
	return format(addMonths(date, delta), 'yyyy-MM');
}

export function monthLabel(month: string): string {
	const date = parse(month, 'yyyy-MM', new Date());
	return format(date, 'yyyy년 M월');
}
