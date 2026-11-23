import { z } from 'zod';

export const assignmentRowSchema = z.object({
	memail: z.string().min(1),
	job_id: z.string().min(1, '프로젝트를 선택하세요'),
	role_name: z.string().max(50, '50자 이내로 입력하세요'),
	ratio: z.number().min(0, '0 이상이어야 합니다').max(100, '100 이하여야 합니다')
});

export const assignmentFormSchema = z.object({
	rows: z.array(assignmentRowSchema)
});

export type AssignmentRowFormValue = z.infer<typeof assignmentRowSchema>;
export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
