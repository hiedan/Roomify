import { ApiError } from './authApi';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

async function listingRequest(path, signal) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store', signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('NETWORK_ERROR', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
  }

  const envelope = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(envelope?.error?.code || 'SERVER_ERROR',
      envelope?.error?.message || 'Máy chủ chưa thể hoàn thành yêu cầu.', response.status);
  }
  if (!envelope || envelope.success !== true || !Object.hasOwn(envelope, 'data')) {
    throw new ApiError('INVALID_RESPONSE', 'Máy chủ trả về dữ liệu không hợp lệ.', response.status);
  }
  return envelope;
}

export async function getListingFilterOptions(signal) {
  const envelope = await listingRequest('/listings/filters', signal);
  const { districts, roomTypes, amenities } = envelope.data || {};
  if (!Array.isArray(districts) || !Array.isArray(roomTypes) || !Array.isArray(amenities)) {
    throw new ApiError('INVALID_RESPONSE', 'Danh sách bộ lọc từ máy chủ không hợp lệ.');
  }
  return { districts, roomTypes, amenities };
}

export async function searchListings(criteria, signal) {
  const params = new URLSearchParams();
  for (const field of ['keyword', 'district', 'roomType', 'maxPrice', 'minAreaM2', 'maxAreaM2']) {
    const value = criteria[field];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(field, String(value).trim());
    }
  }
  for (const id of new Set(criteria.amenityIds || [])) {
    params.append('amenityIds', String(id));
  }

  const query = params.toString();
  const envelope = await listingRequest(`/listings${query ? `?${query}` : ''}`, signal);
  if (!Array.isArray(envelope.data) || !envelope.pagination ||
      !Number.isInteger(envelope.pagination.page) ||
      !Number.isInteger(envelope.pagination.limit) ||
      !Number.isInteger(envelope.pagination.total)) {
    throw new ApiError('INVALID_RESPONSE', 'Kết quả tìm kiếm từ máy chủ không hợp lệ.');
  }
  return { listings: envelope.data, pagination: envelope.pagination };
}
