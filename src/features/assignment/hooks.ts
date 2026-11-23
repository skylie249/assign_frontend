import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type AssignmentRow } from '../../api/client';

export function useTeamMembers(team: string) {
	return useQuery({
		queryKey: ['assign', 'members', team],
		queryFn: () => api.getTeamMembers(team)
	});
}

export function useProjects(team: string) {
	return useQuery({
		queryKey: ['assign', 'projects', team],
		queryFn: () => api.getProjects(team)
	});
}

export function useAssignments(team: string, month: string) {
	return useQuery({
		queryKey: ['assign', 'assignments', team, month],
		queryFn: () => api.getAssignments(team, month)
	});
}

export function useSaveAssignments(team: string, month: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (rows: Omit<AssignmentRow, 'id' | 'mname' | 'job_name'>[]) =>
			api.saveAssignments(team, month, rows),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['assign', 'assignments', team, month] });
		}
	});
}

export function useCopyPreviousAssignments(team: string, month: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (overwrite: boolean) => api.copyPreviousAssignments(team, month, overwrite),
		onSuccess: (result) => {
			if (result.result === 'SUCCESS') {
				queryClient.invalidateQueries({ queryKey: ['assign', 'assignments', team, month] });
			}
		}
	});
}
