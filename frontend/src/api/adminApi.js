import { apiRequest } from './authApi';

export async function updateUserRoleRequest(token, targetId, role, signal) {
  return apiRequest(`/admin/users/${encodeURIComponent(targetId)}/role`, {
    method: 'PATCH',
    body: { role },
    token,
    signal,
  });
}

export async function updateUserStatusRequest(token, targetId, isActive, signal) {
  return apiRequest(`/admin/users/${encodeURIComponent(targetId)}/status`, {
    method: 'PATCH',
    body: { isActive },
    token,
    signal,
  });
}
