import { z } from 'zod';

export const issueStatusSchema = z.enum(['normal', 'caution', 'risk']);

export const newIssueSchema = z.object({
	job_id: z.string().min(1, '프로젝트를 선택하세요'),
	status: issueStatusSchema,
	issue: z.string().min(1, '이슈를 입력하세요'),
	action: z.string(),
	due_on: z.string()
});

export type NewIssueFormValues = z.infer<typeof newIssueSchema>;
