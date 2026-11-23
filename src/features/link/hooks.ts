import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CreatePeriodBody } from '../../api/client';

export function useCreatePeriod(team: string) {
	return useMutation({
		mutationFn: (body: CreatePeriodBody) => api.createPeriod(team, body)
	});
}

export function useIssueTokens(periodId: number) {
	return useMutation({
		mutationFn: (memails: string[]) => api.issueTokens(periodId, memails)
	});
}

export function useReissueToken() {
	return useMutation({
		mutationFn: (tokenId: number) => api.reissueToken(tokenId)
	});
}

export function usePeriodStatus(periodId: number | null) {
	return useQuery({
		queryKey: ['assign', 'periodStatus', periodId],
		queryFn: () => api.getPeriodStatus(periodId as number),
		enabled: periodId != null
	});
}

export function useReviewConfirmation(periodId: number) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ confirmationId, action }: { confirmationId: number; action: 'apply' | 'ignore' }) =>
			api.reviewConfirmation(confirmationId, action),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['assign', 'periodStatus', periodId] });
		}
	});
}
