import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';

// 월요일 시작 주. "YYYY-MM-DD"(그 주의 월요일) 하나로 주차를 식별한다(wr_assign_issue.week_start).
export function currentWeekStart(): string {
	return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function shiftWeek(weekStart: string, deltaWeeks: number): string {
	return format(addDays(parseISO(weekStart), deltaWeeks * 7), 'yyyy-MM-dd');
}

export function weekLabel(weekStart: string): string {
	const start = parseISO(weekStart);
	const end = addDays(start, 6);
	const fmt = (d: Date) => format(d, 'M/d(EEE)', { locale: ko });
	return fmt(start) + ' ~ ' + fmt(end);
}

export function monthOfWeek(weekStart: string): string {
	return format(parseISO(weekStart), 'yyyy-MM');
}
