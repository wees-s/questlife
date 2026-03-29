import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useAuthStore } from '../stores/authStore';

// Auth
export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', data, { skipAuth: true }),
    onSuccess: (data) => {
      useAuthStore.getState().setAuth(data.user, data.accessToken, data.refreshToken);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { username: string; email: string; password: string; class?: string }) =>
      api.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', data, { skipAuth: true }),
    onSuccess: (data) => {
      useAuthStore.getState().setAuth(data.user, data.accessToken, data.refreshToken);
    },
  });
}

// User
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<any>('/users/me'),
  });
}

// Quests
export function useQuests() {
  return useQuery({
    queryKey: ['quests'],
    queryFn: () => api.get<any[]>('/quests'),
  });
}

export function useQuest(id: string) {
  return useQuery({
    queryKey: ['quest', id],
    queryFn: () => api.get<any>(`/quests/${id}`),
    enabled: !!id,
  });
}

export function useStartQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questId: string) => api.post(`/quests/${questId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
}

export function useAbandonQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questId: string) => api.post(`/quests/${questId}/abandon`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
}

export function useSendHeartbeat() {
  return useMutation({
    mutationFn: ({ questId, timestamp }: { questId: string; timestamp: number }) =>
      api.post(`/quests/${questId}/heartbeat`, { timestamp }),
  });
}

export function useSendGpsTrack() {
  return useMutation({
    mutationFn: ({ questId, points }: { questId: string; points: Array<{ lat: number; lng: number; timestamp: number }> }) =>
      api.post(`/quests/${questId}/track`, { points }),
  });
}
