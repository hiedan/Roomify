const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function apiRequest(path, { method = 'GET', body, token, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('NETWORK_ERROR', 'Cannot reach the server. Please retry.');
  }
  const envelope = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(envelope?.error?.code || 'SERVER_ERROR',
      envelope?.error?.message || 'The server could not complete this request.', response.status);
  }
  if (!envelope || envelope.success !== true || !Object.hasOwn(envelope, 'data')) {
    throw new ApiError('INVALID_RESPONSE', 'The server returned an invalid response.', response.status);
  }
  return envelope.data;
}

function profile(data) {
  if (!data || typeof data.id !== 'string' || !/^[1-9][0-9]*$/.test(data.id) ||
      typeof data.fullName !== 'string' || !data.fullName || typeof data.email !== 'string' ||
      !['tenant', 'landlord', 'admin'].includes(data.role) || data.isActive !== true) {
    throw new ApiError('INVALID_RESPONSE', 'The server returned an invalid account.');
  }
  const { id, fullName, email, role, isActive } = data;
  return { id, fullName, email, role, isActive };
}

async function sessionRequest(path, payload, signal) {
  const data = await apiRequest(path, { method: 'POST', body: payload, signal });
  if (typeof data?.token !== 'string' || !data.token.trim() || !Number.isInteger(data.expiresIn) || data.expiresIn <= 0) {
    throw new ApiError('INVALID_RESPONSE', 'The server did not establish a session.');
  }
  return { user: profile(data.user), token: data.token };
}

export const loginRequest = (payload, signal) => sessionRequest('/auth/login', payload, signal);
export const registerRequest = (payload, signal) => sessionRequest('/auth/register', payload, signal);
export const currentUserRequest = async (token, signal) => profile(await apiRequest('/auth/me', { token, signal }));
export const logoutRequest = () => apiRequest('/auth/logout', { method: 'POST' });
