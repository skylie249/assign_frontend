import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CreateIssueBody, type UpdateIssueBody } from '../../api/client';

export function useIssues(team: string, week: string) {
	return useQuery({
		queryKey: ['assign', 'issues', team, week],
		queryFn: () => api.getIssues(team, week)
	});
}

export function useCreateIssue(team: string, week: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateIssueBody) => api.createIssue(team, body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['assign', 'issues', team, week] });
		}
	});
}

export function useUpdateIssue(team: string, week: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: number; body: UpdateIssueBody }) => api.updateIssue(team, id, body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['assign', 'issues', team, week] });
		}
	});
}
