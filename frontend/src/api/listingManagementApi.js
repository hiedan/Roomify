import { ApiError } from './authApi';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'roomify-auth-token';

function getStoredToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function defaultErrorMessage(status) {
  switch (status) {
    case 400:
      return 'Dữ liệu tin đăng không hợp lệ. Vui lòng kiểm tra lại.';
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 403:
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 404:
      return 'Không tìm thấy tin đăng yêu cầu.';
    default:
      return 'Máy chủ chưa thể hoàn thành yêu cầu.';
  }
}

async function managementRequest(path, { method = 'GET', body, token, signal } = {}) {
  const authToken = token ?? getStoredToken();
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('NETWORK_ERROR', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
  }

  const envelope = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      envelope?.error?.code || 'SERVER_ERROR',
      envelope?.error?.message || defaultErrorMessage(response.status),
      response.status
    );
  }

  if (!envelope || envelope.success !== true || !Object.hasOwn(envelope, 'data')) {
    throw new ApiError('INVALID_RESPONSE', 'Máy chủ trả về dữ liệu không hợp lệ.', response.status);
  }

  return envelope.data;
}

export function createListing(payload, options = {}) {
  return managementRequest('/listings', {
    method: 'POST',
    body: payload,
    ...options,
  });
}

export function getMyListings(status = 'all', options = {}) {
  const normalizedStatus = status || 'all';
  const params = new URLSearchParams({ status: normalizedStatus });
  return managementRequest(`/listings/mine?${params.toString()}`, {
    method: 'GET',
    ...options,
  });
}

export function getMyListingById(id, options = {}) {
  return managementRequest(`/listings/mine/${encodeURIComponent(id)}`, {
    method: 'GET',
    ...options,
  });
}

export function updateListing(id, payload, options = {}) {
  return managementRequest(`/listings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
    ...options,
  });
}

export function deleteListing(id, options = {}) {
  return managementRequest(`/listings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    ...options,
  });
}
