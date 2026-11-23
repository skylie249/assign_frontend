import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type LeaveRow } from '../../api/client';

export function useLeaves(team: string, month: string) {
	return useQuery({
		queryKey: ['assign', 'leaves', team, month],
		queryFn: () => api.getLeaves(team, month)
	});
}

export function useSaveLeaves(team: string, month: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (rows: Omit<LeaveRow, 'id' | 'mname'>[]) => api.saveLeaves(team, month, rows),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['assign', 'leaves', team, month] });
		}
	});
}
