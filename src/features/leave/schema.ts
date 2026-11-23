import { z } from 'zod';

export const leaveRowSchema = z
	.object({
		memail: z.string().min(1),
		starts_on: z.string().min(1, '시작일을 선택하세요'),
		ends_on: z.string().min(1, '종료일을 선택하세요'),
		days: z.number().min(0.5, '0.5일 이상이어야 합니다')
	})
	.refine((row) => row.ends_on >= row.starts_on, {
		message: '종료일이 시작일보다 빠릅니다',
		path: ['ends_on']
	});

export const leaveFormSchema = z.object({
	rows: z.array(leaveRowSchema)
});

export type LeaveRowFormValue = z.infer<typeof leaveRowSchema>;
export type LeaveFormValues = z.infer<typeof leaveFormSchema>;
